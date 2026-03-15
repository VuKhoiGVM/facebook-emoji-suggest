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
- Fetch stickers on-demand from Facebook's API
- Send stickers via hybrid approach (API first, DOM fallback)

## Non-Goals

- Custom sticker uploads
- Third-party sticker APIs
- Offline sticker support
- Sticker favorites/recently used (future consideration)

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
│  ┌─────────────────┐    ┌─────────────────────────────────┐│
│  │ StickerService  │    │    StickerSender (Hybrid)       ││
│  │  - fetch()      │    │  - sendViaAPI()                 ││
│  │  - cache        │    │  - sendViaDOM()                 ││
│  └─────────────────┘    └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Background Script                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐│
│  │ matchEmoji()    │    │    StickerMatcher (new)         ││
│  │  (existing)     │    │  - keyword → sticker IDs        ││
│  └─────────────────┘    └─────────────────────────────────┘│
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
3. Background: matchEmoji("love") returns emojis immediately
      │
      ├──▶ Emoji Tab: Shows instantly
      │
      └──▶ Sticker Tab: Shows loading
              │
              ▼
4. StickerService.fetchStickers("love")
      │
      ▼
5. Facebook Sticker API returns sticker data
      │
      ▼
6. Sticker Tab: Populates with thumbnails
      │
      ▼
7. User clicks sticker
      │
      ▼
8. StickerSender.send(stickerId)
      │
      ├─▶ Try: sendViaAPI() ─▶ Success ✓
      │
      └─▶ Fallback: sendViaDOM() ─▶ Success ✓
```

## Component Details

### 1. TabbedSuggestionPopup (extends SuggestionPopup)

**Responsibilities:**
- Render tabbed interface (Emoji | Stickers)
- Handle tab switching
- Show loading state for stickers
- Delegate emoji selection to existing handler
- Delegate sticker selection to StickerSender

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

    <!-- Stickers: grid or horizontal scroll -->
    <div class="sticker-grid">
      <img class="sticker-item" src="...">
    </div>
  </div>
</div>
```

**Styling:**
- Tabs: Small, subtle pills above the content
- Stickers: 64x64px thumbnails in horizontal scrollable row
- Loading: Skeleton placeholders or spinner

### 2. StickerService

**Responsibilities:**
- Fetch stickers from Facebook API by keyword
- Cache responses per session (Map<keyword, stickers>)
- Transform API response to sticker objects

**API Discovery (Research Required):**
- Likely endpoints: `/api/graphql` with sticker query
- Need to identify: sticker ID format, thumbnail URLs, send endpoint
- May need to inspect Facebook's network requests

**Sticker Object:**
```typescript
interface Sticker {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  name?: string;
}
```

### 3. StickerSender (Hybrid)

**Responsibilities:**
- Send sticker via Facebook's internal API
- Fallback to DOM manipulation if API fails

**API Method (Primary):**
```typescript
async function sendViaAPI(stickerId: string, threadId: string): Promise<boolean> {
  // Likely GraphQL mutation
  // Need to reverse-engineer the exact endpoint and payload
}
```

**DOM Method (Fallback):**
```typescript
async function sendViaDOM(stickerId: string): Promise<boolean> {
  // 1. Open Facebook's sticker picker
  // 2. Find sticker by ID/data attribute
  // 3. Click it programmatically
  // 4. Close picker
}
```

### 4. StickerMatcher (Background)

**Responsibilities:**
- Map keywords to sticker search queries
- Trigger sticker fetch when keyword matches

**Implementation:**
- Reuse existing keyword detection
- Add new message type for sticker requests

## File Structure

```
src/
├── content/
│   ├── index.ts              # Modified: handle sticker selection
│   ├── input-monitor.ts      # Unchanged
│   ├── suggestion-popup/
│   │   ├── index.ts          # Modified: add tabs
│   │   └── styles.ts         # Modified: add tab styles
│   ├── sticker-service.ts    # NEW: fetch stickers from FB
│   └── sticker-sender.ts     # NEW: hybrid send mechanism
├── background/
│   └── index.ts              # Modified: add sticker message handling
├── lib/
│   ├── emoji-suggestions.ts  # Unchanged
│   └── kaomoji.ts            # Unchanged
└── types/
    └── index.ts              # Modified: add Sticker types
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Sticker API fails | Show "Stickers unavailable" message, keep emoji tab working |
| Send API fails | Fallback to DOM method |
| DOM method fails | Show error toast, log for debugging |
| No stickers found for keyword | Hide sticker tab or show empty state |
| Network timeout | 5s timeout, then show unavailable message |

## Testing Strategy

1. **Unit Tests:**
   - StickerMatcher keyword mapping
   - Sticker object transformation
   - Cache hit/miss logic

2. **Integration Tests:**
   - Tab switching behavior
   - Sticker fetch → display flow
   - Send mechanism fallback

3. **Manual Testing:**
   - Verify sticker fetch works on facebook.com/messages
   - Verify sticker sends correctly
   - Test fallback when API changes

## Security Considerations

- Sticker API calls use Facebook's existing session (no auth tokens stored)
- No user data collected or transmitted externally
- CSP-compliant (no inline scripts)

## Rollout Plan

1. **Phase 1:** Research Facebook sticker API endpoints
2. **Phase 2:** Implement StickerService (fetch only)
3. **Phase 3:** Add tabbed UI to popup
4. **Phase 4:** Implement StickerSender (hybrid)
5. **Phase 5:** Testing and refinement

## Success Criteria

- [ ] Stickers appear in separate tab when typing trigger words
- [ ] Stickers load within 2 seconds of typing
- [ ] Clicking a sticker sends it to the chat
- [ ] Emoji/kaomoji flow remains unchanged and instant
- [ ] Graceful degradation when stickers unavailable
