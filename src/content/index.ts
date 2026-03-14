import { setupInputMonitor, findChatInput } from "@/content/input-monitor";
import { getStickersForTerm, closeStickerPicker } from "@/content/sticker-picker";
import { SuggestionPopup, calculatePopupPosition } from "@/content/suggestion-popup";
import type { KeywordMatchResponse, StickerData } from "@/types";

console.log("[FB Emoji Suggest] Content script loaded");

const popup = new SuggestionPopup();
let cleanupMonitor: (() => void) | null = null;

/**
 * Clear text from the chat input
 */
function clearChatInput(): void {
  const input = findChatInput();
  if (input) {
    // For contenteditable, we need to clear the content
    input.textContent = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/**
 * Handle sticker selection
 */
async function handleStickerSelect(sticker: StickerData): Promise<void> {
  // Click the sticker in Facebook's picker to send it
  const { clickSticker } = await import("@/content/sticker-picker");
  await clickSticker(sticker);

  // Clear the typed text
  clearChatInput();
}

/**
 * Handle keyword match from input monitor
 */
async function handleKeywordMatch(
  response: KeywordMatchResponse,
  _word: string
): Promise<void> {
  if (!response.matched) {
    popup.hide();
    await closeStickerPicker();
    return;
  }

  // Get input element for positioning
  const input = findChatInput();
  if (!input) {
    popup.hide();
    return;
  }

  // Calculate position
  const position = calculatePopupPosition(input);

  // Show loading state
  popup.showLoading(position);

  // Get stickers from Facebook's picker
  const stickers = await getStickersForTerm(response.searchTerm);

  if (stickers.length === 0) {
    popup.hide();
    return;
  }

  // Show popup with stickers
  popup.show(stickers, position, handleStickerSelect);
}

/**
 * Initialize the extension
 */
function init(): void {
  console.log("[FB Emoji Suggest] Initializing...");

  // Clean up previous monitor if exists
  if (cleanupMonitor) {
    cleanupMonitor();
  }

  // Set up input monitoring
  cleanupMonitor = setupInputMonitor(handleKeywordMatch);

  if (cleanupMonitor) {
    console.log("[FB Emoji Suggest] Ready!");
  }
}

/**
 * Watch for Facebook's dynamic navigation
 * Facebook uses client-side routing, so we need to re-init on page changes
 */
function setupNavigationWatcher(): void {
  let lastUrl = location.href;

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("[FB Emoji Suggest] Navigation detected, re-initializing...");
      init();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Wait for page to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init();
    setupNavigationWatcher();
  });
} else {
  init();
  setupNavigationWatcher();
}
