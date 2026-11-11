---
name: icon-retrieval
description: Search icons through the search_icon tool and retrieve SVG icon URLs.
---

# Icon Search

Use the `search_icon` tool to search icons (the tool performs the HTTP call internally; never use curl).

## Tool

`search_icon(text, top_k)`

- `text` (required): search keyword, e.g. `"data analysis"`
- `top_k` (required): number of icons to fetch (1-20), use `5` when unsure

Typical response:

```json
{
  "icons": [
    "https://example.com/icon1.svg",
    "https://example.com/icon2.svg"
  ]
}
```

## Workflow

1. Determine the icon concept keyword (for example: `security`, `document`, `data`).
2. Call `search_icon` to get icon URLs.
3. Use the returned SVG URLs directly in pages, diagrams, or infographic materials.

## Notes

- `top_k` range is 1–20; the service returns up to 5 results when a small value is given.
- On tool failure, retry with a smaller `top_k` or a different keyword.
