# Markdown Export for Reddit

A Chrome extension that downloads any Reddit post and all its comments as a clean Markdown (`.md`) file.

## What It Does

When you're viewing a Reddit post, click the **Download .md** button that appears in the bottom-right corner. The extension will:

1. Automatically expand all "load more comments" and "continue this thread" links
2. Extract the post title, author, subreddit, score, date, and body text
3. Extract all comments with their authors, scores, dates, flair, and proper nesting
4. Convert everything to well-formatted Markdown
5. Download the result as a `.md` file

## Features

- Works on **new Reddit** (www.reddit.com), **old Reddit** (old.reddit.com), and **sh.reddit.com**
- Preserves comment threading with nested blockquotes
- Converts Reddit's HTML formatting to proper Markdown (bold, italic, code blocks, links, lists, etc.)
- Generates descriptive filenames: `reddit-{subreddit}-{post-slug}-{date}.md`
- No account required, no data collection

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. Navigate to any Reddit post and look for the orange "Download .md" button

## Output Format

The generated Markdown file includes:

```markdown
# Post Title

**Subreddit:** r/example | **Posted by:** u/author | **Score:** 1.2k | **Date:** 6 Oct 2026

## Post

The post body text goes here...

---

## Comments (42)

### u/commenter1 · ↑ 100 · 5 Oct 2026
Top-level comment text...

> ### u/replier · ↑ 50 · 5 Oct 2026
> Reply to the comment...

> > ### u/another · ↑ 25 · 5 Oct 2026
> > Nested reply...
```

## Privacy

This extension operates entirely locally. It reads the visible page content, converts it to Markdown, and triggers a file download. **No data is collected, stored, or transmitted.** See [PRIVACY.md](PRIVACY.md) for details.

## Use Cases

- Archive interesting discussions for offline reading
- Save research material from technical subreddits
- Export content for note-taking apps that support Markdown
- Create backups of valuable community knowledge

## License

[MIT License](LICENSE) — Copyright (c) 2026 Sree Sai Ganesh A
