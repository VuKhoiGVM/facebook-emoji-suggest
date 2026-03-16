# Fix Sticker Popup Issues - Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical bugs where popup is immediately removed and stickers don't display properly

**Architecture:** The core issue is that `getStickersForTerm()` opens Facebook's sticker picker, which triggers DOM events that close our popup via the `clickOutsideHandler`. We need to: (1) Delay sticker fetching until user clicks Stickers tab, (2) Prevent popup from closing during sticker operations, (3) Add proper state management.

**Tech Stack:** TypeScript, Chrome Extension Manifest V3, Shadow DOM

---

## Critical Issues to Fix

### Issue 1: Popup Immediately Removed
**Root Cause:** `getStickersForTerm()` is called immediately after showing popup. This function clicks Facebook's sticker button, which triggers a `click` event. Our `clickOutsideHandler` sees this click and closes the popup.

**Solution:** Only fetch stickers when user explicitly clicks the "Stickers" tab, not automatically.

### Issue 2: Chat Input Detection
**Root Cause:** The emoji/kaomoji flow works correctly. The issue is that when sticker fetching happens, it interferes with the popup.

**Solution:** Keep the working emoji flow intact, only add sticker functionality when user requests it.

---

## File Structure

```
src/content/
├── index.ts                    # Modified: Add tab click callback for stickers
├── suggestion-popup/index.ts   # Modified: Add onStickerTabClick callback
└── sticker-picker.ts           # Modified: Add debug logging
```

---

## Chunk 1: Fix Popup Auto-Close Issue

### Task 1: Add Sticker Tab Click Callback

**Files:**
- Modify: `src/content/suggestion-popup/index.ts`

- [ ] **Step 1: Add onStickerTabClick callback to SuggestionPopup class**

Find the class properties and add:
```typescript
private onStickerTabClick?: () => void;
```

- [ ] **Step 2: Update show() method signature**

Add the callback parameter:
```typescript
show(
  emojis: string[],
  position: PopupPosition,
  onEmojiSelect: (emoji: string) => void,
  onStickerSelect?: (stickerUrl: string) => void,
  searchTerm?: string,
  onStickerTabClick?: () => void  // NEW: Called when user clicks Stickers tab
): void {
```

Store it:
```typescript
this.onStickerTabClick = onStickerTabClick;
```

- [ ] **Step 3: Update tab click handler**

Find the `stickerTab.addEventListener("click"...)` line and update:
```typescript
stickerTab.addEventListener("click", () => {
  switchTab("stickers");
  // Only fetch stickers when user explicitly clicks the tab
  if (this.onStickerTabClick) {
    this.onStickerTabClick();
  }
});
```

- [ ] **Step 4: Remove automatic sticker fetching from content script**

In `src/content/index.ts`, find and REMOVE this code from `handleKeywordMatch`:
```typescript
// DELETE THIS ENTIRE BLOCK:
// Fetch stickers in background
setTimeout(() => {
  getStickersForTerm(word)
    .then((stickers: StickerData[]) => {
      if (stickers.length > 0) {
        popup.updateStickers(stickers);
      } else {
        popup.showStickerError("No stickers");
      }
    })
    .catch(() => {
      popup.showStickerError("Error");
    });
}, 100);
```

- [ ] **Step 5: Add sticker fetch callback to popup.show()**

Update the `popup.show()` call in `handleKeywordMatch`:
```typescript
popup.show(
  response.emojis,
  position,
  handleEmojiSelect,
  handleStickerSelect,
  word,
  () => fetchStickers(word)  // NEW: Only called when user clicks Stickers tab
);
```

- [ ] **Step 6: Create fetchStickers helper function**

Add this function in `src/content/index.ts`:
```typescript
/**
 * Fetch stickers when user clicks Stickers tab
 */
async function fetchStickers(word: string): Promise<void> {
  try {
    const stickers = await getStickersForTerm(word);
    if (stickers.length > 0) {
      popup.updateStickers(stickers);
    } else {
      popup.showStickerError("No stickers found");
    }
  } catch (e) {
    console.log("[Stickers] Fetch error:", e);
    popup.showStickerError("Failed to load");
  }
}
```

- [ ] **Step 7: Build and verify**

Run: `bun run build`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "fix: only fetch stickers when user clicks Stickers tab"
```

---

## Chunk 2: Remove Debug Logs

### Task 2: Clean Up Console Logs

**Files:**
- Modify: `src/content/index.ts`
- Modify: `src/content/input-monitor.ts`
- Modify: `src/content/suggestion-popup/index.ts`
- Modify: `src/content/sticker-picker.ts`

- [ ] **Step 1: Remove debug logs from index.ts**

Remove all `console.log` statements except the initial "Content script loaded" log.

- [ ] **Step 2: Remove debug logs from input-monitor.ts**

Remove the `console.log` in `findChatInput()`.

- [ ] **Step 3: Remove debug logs from suggestion-popup/index.ts**

Remove all `console.log` statements from the `show()` method.

- [ ] **Step 4: Remove debug logs from sticker-picker.ts**

Remove `console.log("[Sticker] Finding button...");` and `console.log("[Sticker] Button:", !!btn);`

- [ ] **Step 5: Build and verify**

Run: `bun run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: remove debug logs"
```

---

## Success Criteria

- [ ] Emoji/kaomoji popup appears immediately when typing trigger words
- [ ] Popup stays visible (not immediately removed)
- [ ] Clicking "Stickers" tab triggers sticker fetch
- [ ] Stickers load and display correctly
- [ ] No console errors or spam

## Testing

1. Go to facebook.com/messages
2. Open a conversation
3. Type "hi" - emoji popup should appear and stay visible
4. Click "Stickers" tab - stickers should load
5. Click a sticker - it should send to the chat
