# Permission Justifications

## Single Purpose Statement

This extension exports Reddit posts and their comments to Markdown files for offline reading and archival.

## Host Permissions

| Pattern | Justification |
|---------|---------------|
| `https://www.reddit.com/r/*/comments/*/*` | Required to inject the download button and read post/comment content from new Reddit post pages. |
| `https://www.reddit.com/r/*/comments/*/*/*` | Same as above; handles URLs with trailing path segments (e.g., comment permalinks). |
| `https://old.reddit.com/r/*/comments/*/*` | Required to support old Reddit's interface, which uses different DOM structure. |
| `https://old.reddit.com/r/*/comments/*/*/*` | Same as above; handles old Reddit URLs with trailing segments. |
| `https://sh.reddit.com/r/*/comments/*/*` | Required to support Reddit's sh.reddit.com subdomain variant. |
| `https://sh.reddit.com/r/*/comments/*/*/*` | Same as above; handles sh.reddit.com URLs with trailing segments. |

## Why No Other Permissions

- **No `activeTab`**: Removed. The extension uses content scripts with explicit host matches, which is the correct pattern for page modification. `activeTab` is unnecessary.
- **No `storage`**: The extension does not persist any settings or data between sessions.
- **No `tabs`**: The extension only operates on the current page via content script injection.
- **No remote code**: All functionality is bundled in the extension. No external scripts are loaded.
- **No network requests**: The extension reads only the visible DOM and triggers a local file download.
