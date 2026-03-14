# Facebook Emoji Suggest - Design Document

**Date:** 2026-03-14
**Status:** Approved
**Author:** Design session with user

---

## Overview

A Chrome extension that suggests stickers while typing in Facebook Messenger (facebook.com/messages), similar to Telegram's sticker suggestion feature.

### Goals
- Enhance Facebook Messenger with quick sticker suggestions
- Reduce friction in finding and sending stickers
- Keep implementation simple and maintainable

### Non-Goals
- GIF support (future enhancement)
- Custom sticker uploads
- Cross-browser support (Chrome only)
- messenger.com support (deprecated April 2026)

---

## Technical Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Platform | facebook.com/messages | messenger.com deprecated April 2026 |
| Trigger | Auto-suggest while typing | Natural UX like Telegram |
| Content | Stickers only (MVP) | GIFs added later |
| Source | Facebook's built-in sticker picker | Leverage existing infrastructure, ToS safe |
| Matching | Keyword mapping + partial match + FB search fallback | Best coverage |
| Browser | Chrome only | Simpler, Manifest V3 |
| Language | TypeScript | Type safety, maintainability |
| Build | Bun | Fast, native TS support |
| UI | Shadow DOM popup | Style isolation from Facebook CSS |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Background Service Worker                  │   │
│  │  • Keyword mapping database (50+ triggers)          │   │
│  │  • Matching logic (keyword → search term)           │   │
│  │  • Extension lifecycle management                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                            ↕ Message Passing                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Content Script                          │   │
│  │  • DOM monitoring (chat input field)                │   │
│  │  • Trigger detection                                 │   │
│  │  • Facebook sticker picker interaction              │   │
│  │  • Shadow DOM suggestion popup                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

All components run locally in the browser - no backend server required.

---

## Project Structure

```
facebook-emoji-suggest/
├── public/
│   └── icons/                 # Extension icons (16, 32, 48, 128px)
├── src/
│   ├── background/
│   │   └── index.ts           # Service worker - keyword matching logic
│   ├── content/
│   │   ├── index.ts           # Content script entry point
│   │   ├── input-monitor.ts   # Monitor chat input for triggers
│   │   ├── sticker-picker.ts  # Interact with Facebook's sticker picker
│   │   └── suggestion-popup/  # Shadow DOM popup component
│   │       ├── index.ts
│   │       └── styles.css
│   ├── lib/
│   │   ├── keywords.ts        # 50+ keyword → search term mappings
│   │   └── messaging.ts       # Type-safe message passing utils
│   └── types/
│       └── index.ts           # Shared TypeScript types
├── dist/                      # Bun build output
├── manifest.json              # Chrome Extension manifest (V3)
├── bunfig.toml                # Bun config (optional)
├── tsconfig.json
├── package.json
└── build.ts                   # Custom build script for Bun
```

---

## Data Flow

```
1. USER TYPES "hi" in chat input
          ↓
2. input-monitor.ts detects "hi" matches keyword
          ↓
3. SEND MESSAGE to background: { type: "MATCH_KEYWORD", word: "hi" }
          ↓
4. background/index.ts looks up "hi" → search term "hello wave hi"
          ↓
5. RECEIVE search term, sticker-picker.ts opens FB picker, searches, extracts stickers
          ↓
6. suggestion-popup renders Shadow DOM popup with sticker thumbnails
          ↓
7. USER CLICKS a sticker
          ↓
8. sticker-picker.ts clicks matching sticker in FB panel
          ↓
9. Facebook sends sticker, clear text, close popup
```

### Message Types

```typescript
type MessageType =
  | { type: "MATCH_KEYWORD"; word: string }
  | { type: "KEYWORD_MATCHED"; searchTerm: string }
  | { type: "NO_MATCH" };
```

---

## Keyword Mapping System

### Structure

```typescript
type KeywordMap = {
  [trigger: string]: string;  // trigger → Facebook sticker search term
};
```

### Keywords (50+)

| Category | Triggers |
|----------|----------|
| Greetings | hi, hello, hey, yo |
| Farewells | bye, cya, goodnight |
| Positive | love, thanks, thx, ty, wow, omg, lol, haha, lmao |
| Negative | sad, sorry, no, angry |
| Reactions | yes, ok, cool, nice |
| Expressions | wtf, oops, yay, rip, brb |

### Matching Logic

```typescript
export function matchKeyword(input: string): string | null {
  const normalized = input.toLowerCase().trim();

  // 1. Exact match (priority)
  if (KEYWORDS[normalized]) {
    return KEYWORDS[normalized];
  }

  // 2. Partial match (min 2 chars)
  if (normalized.length >= 2) {
    const partialMatches = Object.keys(KEYWORDS)
      .filter(keyword => keyword.startsWith(normalized));

    if (partialMatches.length === 1) {
      return KEYWORDS[partialMatches[0]];
    }

    if (partialMatches.length > 1) {
      // Combine search terms (deduplicated)
      const searchTerms = partialMatches
        .map(k => KEYWORDS[k])
        .join(' ')
        .split(' ')
        .filter((word, index, self) => self.indexOf(word) === index)
        .slice(0, 5)
        .join(' ');
      return searchTerms || null;
    }
  }

  return null;
}
```

---

## Suggestion Popup UI

### Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│   [😀]  [😂]  [❤️]  [👍]  [🎉]  [😢]  [😠]  [😮]      │
└─────────────────────────────────────────────────────────┘
                    ↑
              Chat input bar
```

### Shadow DOM Structure

```html
<div id="fs-suggestion-popup">
  #shadow-root
  <style>/* Isolated CSS */</style>
  <div class="popup-container">
    <div class="sticker-grid">
      <button class="sticker-item">
        <img src="sticker-url" />
      </button>
      <!-- 6-8 stickers -->
    </div>
  </div>
</div>
```

### Behavior
- Show when keyword matched + stickers loaded
- Hide when: sticker clicked, click outside, Escape key, input cleared
- Position: above chat input, left-aligned

---

## Facebook Sticker Picker Integration

### Approach

1. Find Facebook's sticker button in chat bar
2. Programmatically click to open picker
3. Type search term in picker's search input
4. Wait for results to load
5. Extract top 6-8 sticker elements
6. Display in our Shadow DOM popup
7. On user click, click corresponding sticker in Facebook's picker
8. Facebook sends sticker through normal flow

### Risk Mitigation

- Multiple fallback selectors for Facebook UI elements
- Retry logic with exponential backoff
- Graceful degradation (never break user's chat)
- Log errors without disrupting UX

---

## Chrome Extension Configuration

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Facebook Emoji Suggest",
  "version": "1.0.0",
  "description": "Suggest stickers while typing in Facebook Messenger",
  "permissions": ["activeTab"],
  "host_permissions": [
    "https://www.facebook.com/*",
    "https://facebook.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.facebook.com/messages/*",
        "https://facebook.com/messages/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Build Script (build.ts)

```typescript
import { $ } from "bun";

await $`rm -rf dist`;
await $`mkdir -p dist/icons`;

await Bun.build({
  entrypoints: ["./src/background/index.ts"],
  outdir: "./dist",
  target: "browser",
});

await Bun.build({
  entrypoints: ["./src/content/index.ts"],
  outdir: "./dist",
  target: "browser",
});

await $`cp manifest.json dist/`;
await $`cp -r public/icons/* dist/icons/`;

console.log("✅ Build complete!");
```

---

## Error Handling

### Principles
- Never break user's chat experience
- Graceful degradation
- Silent failures with logging

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Facebook UI changes | Multiple fallback selectors |
| Sticker picker not found | Skip suggestion silently |
| Slow network/loading | Loading state, 3s timeout |
| User types too fast | Debounce 150ms |
| Multiple chat tabs | Independent per tab |
| Popup positioning | Recalculate on scroll/resize |

---

## Testing

### Unit Tests

```
tests/
└── keywords.test.ts
    - Exact match returns correct term
    - Partial match returns combined terms
    - No match returns null
    - Case insensitive
```

### Manual Test Checklist

- [ ] Extension loads without errors
- [ ] Typing "hi" shows sticker suggestions
- [ ] Clicking sticker sends it + clears text
- [ ] Popup positions correctly above chat bar
- [ ] Popup closes on Escape / click outside
- [ ] Works with dark mode
- [ ] Works on new conversation
- [ ] Works on existing conversation

---

## Future Enhancements

1. **GIF Support** - Add GIF suggestions alongside stickers
2. **Custom Keywords** - User-defined keyword mappings
3. **Sticker Favorites** - Remember frequently used stickers
4. **Multi-language** - Support non-English triggers
5. **Settings UI** - Popup for customization
