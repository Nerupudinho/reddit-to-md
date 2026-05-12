// Reddit to Markdown — content script
// Downloads any Reddit post + all comments as a .md file.
// Supports new Reddit (shreddit web components) and old Reddit.

(function () {
  const BTN_ID = 'reddit-md-btn';
  let isRunning = false;

  // ── Utilities ──────────────────────────────────────────────────────────────

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function slugify(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return ''; }
  }

  function formatScore(raw) {
    if (raw === null || raw === undefined || raw === '') return '';
    const n = parseInt(raw, 10);
    if (isNaN(n)) return String(raw);
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }

  // ── Button ─────────────────────────────────────────────────────────────────

  function setBtn(label, disabled) {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.textContent = label;
    btn.disabled = !!disabled;
  }

  function injectButton() {
    if (document.getElementById(BTN_ID)) return;
    // Only inject on actual post pages
    if (
      !document.querySelector('shreddit-post') &&
      !document.querySelector('.thing.link')
    ) return;

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.textContent = 'Download .md';
    btn.title = 'Download this Reddit post and all comments as Markdown';
    btn.addEventListener('click', () => { if (!isRunning) run(); });
    document.body.appendChild(btn);
  }

  // ── HTML → Markdown converter ──────────────────────────────────────────────

  function nodeToMd(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    const children = () => Array.from(node.childNodes).map(nodeToMd).join('');
    switch (tag) {
      case 'br': return '\n';
      case 'p': return children() + '\n\n';
      case 'strong': case 'b': return `**${children()}**`;
      case 'em': case 'i': return `_${children()}_`;
      case 's': case 'del': return `~~${children()}~~`;
      case 'code': {
        if (node.parentElement?.tagName.toLowerCase() === 'pre') return node.textContent;
        return `\`${node.textContent}\``;
      }
      case 'pre': {
        const codeEl = node.querySelector('code');
        const lang = codeEl ? (codeEl.className.match(/language-(\S+)/) || [])[1] || '' : '';
        return `\`\`\`${lang}\n${(codeEl || node).textContent}\n\`\`\`\n\n`;
      }
      case 'h1': return `# ${children()}\n\n`;
      case 'h2': return `## ${children()}\n\n`;
      case 'h3': return `### ${children()}\n\n`;
      case 'ul': {
        const items = Array.from(node.querySelectorAll(':scope > li'))
          .map((li) => `- ${li.textContent.trim()}`).join('\n');
        return items + '\n\n';
      }
      case 'ol': {
        const items = Array.from(node.querySelectorAll(':scope > li'))
          .map((li, i) => `${i + 1}. ${li.textContent.trim()}`).join('\n');
        return items + '\n\n';
      }
      case 'li': return children();
      case 'a': {
        const href = node.getAttribute('href') || '';
        const text = children().trim();
        return href && !href.startsWith('javascript') ? `[${text}](${href})` : text;
      }
      case 'blockquote': return `> ${children().trim()}\n\n`;
      case 'hr': return '\n---\n\n';
      default: return children();
    }
  }

  function elToMd(el) {
    return nodeToMd(el).replace(/\n{3,}/g, '\n\n').trim();
  }

  // ── New Reddit extraction (shreddit web components) ────────────────────────

  function isNewReddit() {
    return !!document.querySelector('shreddit-post');
  }

  function extractPostNew() {
    const post = document.querySelector('shreddit-post');
    if (!post) return null;

    const title =
      post.getAttribute('post-title') ||
      post.querySelector('h1')?.textContent?.trim() ||
      document.title.replace(/\s*[|:—].*$/, '').trim();

    const author = post.getAttribute('author') || '(unknown)';
    const subreddit = post.getAttribute('subreddit-prefixed-name') || '';
    const score = formatScore(post.getAttribute('score'));
    const date = formatDate(post.getAttribute('created-timestamp') || '');

    const bodyEl =
      post.querySelector('div[slot="text-body"]') ||
      post.querySelector('.md') ||
      post.querySelector('[data-click-id="text"]');
    const body = bodyEl ? elToMd(bodyEl) : '';

    return { title, author, subreddit, score, date, body };
  }

  function extractCommentNew(el) {
    const depth = parseInt(el.getAttribute('depth') || '0', 10);
    const author = el.getAttribute('author') || '(deleted)';
    const score = formatScore(el.getAttribute('score'));

    const ts =
      el.getAttribute('created-timestamp') ||
      el.querySelector('time')?.getAttribute('datetime') ||
      el.querySelector('faceplate-timeago')?.getAttribute('ts') || '';
    const date = formatDate(ts);

    const flair =
      el.querySelector('faceplate-flair')?.textContent?.trim() ||
      el.querySelector('[class*="flair"]')?.textContent?.trim() || '';

    // Prefer the direct slot child to avoid picking up nested comment bodies
    const bodyEl =
      el.querySelector(':scope > div[slot="comment"]') ||
      el.querySelector('[slot="comment"]') ||
      el.querySelector('.md');
    const text = bodyEl ? elToMd(bodyEl) : '';

    return { depth, author, score, date, flair, text };
  }

  function collectCommentsNew() {
    return Array.from(document.querySelectorAll('shreddit-comment'))
      .map(extractCommentNew)
      .filter((c) => c.text || c.author !== '(deleted)');
  }

  // ── Old Reddit extraction ──────────────────────────────────────────────────

  function extractPostOld() {
    const post = document.querySelector('.thing.link');
    if (!post) return null;

    const title =
      document.querySelector('a.title')?.textContent?.trim() ||
      document.title.replace(/\s*[|:—].*$/, '').trim();
    const author = post.querySelector('.author')?.textContent?.trim() || '(unknown)';
    const subreddit = post.querySelector('.subreddit')?.textContent?.trim() || '';
    const rawScore =
      post.querySelector('.score.unvoted, .score.likes, .score.dislikes')?.getAttribute('title') || '';
    const score = formatScore(rawScore);
    const date = formatDate(post.querySelector('time')?.getAttribute('datetime') || '');

    const bodyEl = post.querySelector('.usertext-body > .md');
    const body = bodyEl ? elToMd(bodyEl) : '';

    return { title, author, subreddit, score, date, body };
  }

  function extractCommentsOldRecursive(el, depth) {
    const results = [];

    const author =
      el.querySelector(':scope > .entry .author')?.textContent?.trim() || '(deleted)';
    const rawScore =
      el.querySelector(':scope > .entry .score')?.getAttribute('title') ||
      el.querySelector(':scope > .entry .score')?.textContent?.trim() || '';
    const score = formatScore(rawScore);
    const date = formatDate(
      el.querySelector(':scope > .entry time')?.getAttribute('datetime') || ''
    );
    const flair =
      el.querySelector(':scope > .entry .flair')?.textContent?.trim() || '';

    const bodyEl = el.querySelector(':scope > .entry .usertext-body > .md');
    const text = bodyEl ? elToMd(bodyEl) : '';

    results.push({ depth, author, score, date, flair, text });

    el.querySelectorAll(':scope > .child > .listing > .comment').forEach((child) => {
      results.push(...extractCommentsOldRecursive(child, depth + 1));
    });

    return results;
  }

  function collectCommentsOld() {
    const results = [];
    document.querySelectorAll('.commentarea > .sitetable > .comment').forEach((el) => {
      results.push(...extractCommentsOldRecursive(el, 0));
    });
    return results;
  }

  // ── Load-more expansion ────────────────────────────────────────────────────

  function findLoadMoreButtons() {
    return Array.from(document.querySelectorAll('button, a')).filter((el) => {
      if (el.disabled) return false;
      const text = (el.textContent || '').trim().toLowerCase();
      return (
        /^\d+\s+more\s+repl/.test(text) ||
        text === 'load more comments' ||
        text.includes('more comments') ||
        text.includes('continue this thread') ||
        text.includes('view more comments')
      );
    });
  }

  async function expandAllComments() {
    const MAX_CLICKS = 150;
    const MAX_MS = 60000;
    let totalClicks = 0;
    const start = Date.now();

    while (totalClicks < MAX_CLICKS && Date.now() - start < MAX_MS) {
      const buttons = findLoadMoreButtons();
      if (buttons.length === 0) break;

      for (const btn of buttons) {
        try { btn.click(); } catch (e) { /* ignore */ }
        totalClicks++;
      }

      setBtn(`Expanding… (${totalClicks})`, true);
      await sleep(1200);
    }
  }

  // ── Build Markdown ─────────────────────────────────────────────────────────

  function commentToMd(comment) {
    const prefix = '> '.repeat(comment.depth);

    const meta = [
      `u/${comment.author}`,
      comment.score ? `↑ ${comment.score}` : null,
      comment.date || null,
      comment.flair ? `· _${comment.flair}_` : null,
    ].filter(Boolean).join(' · ');

    const lines = [`${prefix}### ${meta}`];

    if (comment.text) {
      comment.text.split('\n').forEach((line) => {
        lines.push(`${prefix}${line}`);
      });
    }

    lines.push('');
    return lines.join('\n');
  }

  function buildMarkdown(post, comments) {
    const header = [
      post.subreddit ? `**Subreddit:** ${post.subreddit}` : null,
      `**Posted by:** u/${post.author}`,
      post.score ? `**Score:** ${post.score}` : null,
      post.date ? `**Date:** ${post.date}` : null,
    ].filter(Boolean).join(' | ');

    const parts = [
      `# ${post.title}`,
      '',
      header,
      '',
      '## Post',
      '',
      post.body || '*(Link post — no text body)*',
      '',
      '---',
      '',
      `## Comments (${comments.length})`,
      '',
      ...comments.map(commentToMd),
    ];

    return parts.join('\n');
  }

  // ── Download ───────────────────────────────────────────────────────────────

  function download(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Filename helpers ───────────────────────────────────────────────────────

  function getSubredditName() {
    const m = window.location.pathname.match(/\/r\/([^/]+)/);
    return m ? m[1] : 'reddit';
  }

  function getPostSlug() {
    const m = window.location.pathname.match(/\/comments\/[^/]+\/([^/]+)/);
    return m ? m[1] : 'post';
  }

  // ── Main run ───────────────────────────────────────────────────────────────

  async function run() {
    isRunning = true;
    try {
      setBtn('Expanding…', true);
      await expandAllComments();

      setBtn('Capturing…', true);

      let post, comments;
      if (isNewReddit()) {
        post = extractPostNew();
        comments = collectCommentsNew();
      } else {
        post = extractPostOld();
        comments = collectCommentsOld();
      }

      if (!post) {
        alert('Reddit to MD: could not find post content. Make sure you are on a Reddit post page.');
        return;
      }

      const md = buildMarkdown(post, comments);
      const sub = slugify(getSubredditName());
      const slug = slugify(getPostSlug());
      const date = new Date().toISOString().slice(0, 10);
      const filename = `reddit-${sub}-${slug}-${date}.md`;
      download(md, filename);

      setBtn('Done!', true);
      await sleep(2000);
    } catch (err) {
      console.error('[reddit-to-md]', err);
      alert('Reddit to MD: something went wrong. Check the console for details.');
    } finally {
      setBtn('Download .md', false);
      isRunning = false;
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  injectButton();

  // Re-check after DOM changes in case the post loads after the script
  const observer = new MutationObserver(() => { injectButton(); });
  observer.observe(document.body, { childList: true, subtree: false });
})();
