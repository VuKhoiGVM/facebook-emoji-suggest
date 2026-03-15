# Sticker Suggestions for Facebook Messages - Design Spec

**Date:** 2026-03-15
**Status:** Approved
**Author:** Design Session

## Overview

Add sticker suggestions to the existing Facebook Emoji Suggest Chrome extension. When users type trigger words (hi, love, lol, etc.), the popup will show two tabs: one for emoji/kaomoji and one for Facebook stickers.

## Goals

- Extend existing suggestion system with Facebook stickers
- Maintain separate flow for stickers (tabbed UI)
- Use same trigger words as emoji/kaomoji
- Fetch stickers on-demand via existing DOM-based approach
- Send stickers by clicking through Facebook's sticker picker

## Non-Goals

- Custom sticker uploads
- Third-party sticker APIs
- Offline sticker support
- Sticker favorites/recently used (future consideration)
- Facebook API reverse-engineering (use DOM approach)

## Existing Code (Reuse)

The codebase already has substantial sticker infrastructure in `src/content/sticker-picker.ts`:

| Function | Purpose | Reuse |
|----------|---------|-------|
| `findStickerButton()` | Find sticker button in chat toolbar | ✅ Reuse |
| `openStickerPicker()` | Click to open picker | ✅ Reuse |
| `closeStickerPicker()` | Close picker panel | ✅ Reuse |
| `searchStickers(term)` | Type in search input | ✅ Reuse |
| `extractStickers()` | Get sticker elements from DOM | ✅ Reuse |
| `clickSticker(sticker)` | Click to send | ✅ Reuse |
| `getStickersForTerm(term)` | Full flow: open → search → extract | ✅ Reuse |

Existing `StickerData` type in `src/types/index.ts`:
```typescript
interface StickerData {
  element: HTMLElement;  // Clickable parent element
  imageUrl: string;      // Thumbnail URL
  index: number;         // Position in list
}
```

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Script                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐│
│  │  Input Monitor  │───▶│     SuggestionPopup (Tabbed)    ││
│  │   (existing)    │    │  ┌───────────┬─────────────────┐││
│  └─────────────────┘    │  │ Emoji Tab │ Sticker Tab     │││
│                         │  │ (existing)│ (new)           │││
│                         │  └───────────┴─────────────────┘││
│                         └─────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │              sticker-picker.ts (EXISTING)               ││
│  │  - getStickersForTerm() → StickerData[]                 ││
│  │  - clickSticker() → sends sticker                       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User types "love"
      │
      ▼
2. Input Monitor detects keyword
      │
      ▼
3. Emoji Tab: Shows instantly (existing flow)
      │
      └──▶ Sticker Tab: Shows loading
              │
              ▼
4. getStickersForTerm("love") [from sticker-picker.ts]
      │
      ├──▶ openStickerPicker() - opens FB picker
      │
      ├──▶ searchStickers("love") - types in search
      │
      └──▶ extractStickers() - gets StickerData[]
              │
              ▼
5. Sticker Tab: Populates with thumbnails
      │
      ▼
6. User clicks sticker
      │
      ▼
7. clickSticker(sticker) - clicks element, closes picker
```

## Component Details

### 1. TabbedSuggestionPopup (extends SuggestionPopup)

**Responsibilities:**
- Render tabbed interface (Emoji | Stickers)
- Handle tab switching
- Show loading state for stickers
- Delegate emoji selection to existing handler
- Delegate sticker selection to `clickSticker()`

**UI Structure:**
```html
<div class="popup-container">
  <div class="tabs">
    <button class="tab active" data-tab="emoji">Emoji</button>
    <button class="tab" data-tab="stickers">Stickers</button>
  </div>
  <div class="tab-content">
    <!-- Emoji: horizontal scrollable row -->
    <div class="emoji-grid">...</div>

    <!-- Stickers: horizontal scrollable row -->
    <div class="sticker-grid">
      <button class="sticker-item">
        <img src="sticker-url">
      </button>
    </div>
  </div>
</div>
```

**Styling:**
- Tabs: Small, subtle pills above the content
- Stickers: 64x64px thumbnails in horizontal scrollable row (same pattern as emoji)
- Loading: Spinner or skeleton placeholders

### 2. sticker-picker.ts (Existing - Minor Modifications)

**Current Issues to Fix:**
- Duplicate `isPickerOpen()` function (lines 243 and 271) - remove duplicate
- Debug console.log statements - remove in production

**Modifications Needed:**
- Keep picker open after extracting stickers (currently closes if no stickers found)
- Add `keepOpen` parameter to `getStickersForTerm()`
- Export `closeStickerPicker()` for popup to call after sticker selection

### 3. Types (Minor Addition)

Add to `src/types/index.ts`:
```typescript
/**
 * Message type for sticker fetching
 */
export type ExtensionMessage =
  | { type: "MATCH_KEYWORD"; word: string }
  | { type: "FETCH_STICKERS"; searchTerm: string }  // NEW
  | { type: "KEYWORD_MATCHED"; searchTerm: string }
  | { type: "NO_MATCH" };
```

## File Structure

```
src/
├── content/
│   ├── index.ts              # Modified: add sticker tab handling
│   ├── input-monitor.ts      # Unchanged
│   ├── suggestion-popup/
│   │   ├── index.ts          # Modified: add tabs
│   │   └── styles.ts         # Modified: add tab styles
│   └── sticker-picker.ts     # Modified: minor fixes, keep picker open
├── background/
│   └── index.ts              # Unchanged (stickers handled in content)
├── lib/
│   ├── emoji-suggestions.ts  # Unchanged
│   └── kaomoji.ts            # Unchanged
└── types/
    └── index.ts              # Modified: add FETCH_STICKERS message type
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Sticker button not found | Hide sticker tab, show emoji only |
| Picker fails to open | Show "Stickers unavailable" in tab |
| Search returns no results | Show "No stickers found" message |
| Sticker click fails | Log error, close picker gracefully |
| Concurrent fetch attempts | Use existing `isFetchingStickers` lock |

## Testing Strategy

1. **Unit Tests:**
   - Tab switching behavior
   - Sticker data transformation

2. **Integration Tests:**
   - Sticker fetch → display flow
   - Click → send flow

3. **Manual Testing:**
   - Verify sticker fetch works on facebook.com/messages
   - Verify sticker sends correctly
   - Test with various keywords (hi, love, lol, etc.)

## Implementation Steps

1. **Phase 1: Add Tab UI** (~30 min)
   - Modify `SuggestionPopup` to support tabs
   - Add tab styles
   - Show "Stickers" tab with loading state

2. **Phase 2: Integrate Sticker Fetching** (~20 min)
   - Call `getStickersForTerm()` from content script
   - Display stickers in tab when loaded
   - Handle loading/error states

3. **Phase 3: Handle Sticker Selection** (~15 min)
   - Call `clickSticker()` on sticker click
   - Close picker after sending
   - Clear typed keyword from input

4. **Phase 4: Cleanup** (~10 min)
   - Remove duplicate `isPickerOpen()` function
   - Remove debug logs
   - Test and refine

## Security Considerations

- Uses Facebook's existing DOM (no API reverse-engineering)
- No user data collected or transmitted externally
- CSP-compliant (no inline scripts)

## Success Criteria

- [ ] Stickers appear in separate tab when typing trigger words
- [ ] Stickers load within 2 seconds of typing
- [ ] Clicking a sticker sends it to the chat
- [ ] Emoji/kaomoji flow remains unchanged and instant
- [ ] Graceful degradation when stickers unavailable
- [ ] Picker closes cleanly after sticker is sent
