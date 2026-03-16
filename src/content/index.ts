import { setupInputMonitor, findChatInput } from "@/content/input-monitor";
import { SuggestionPopup, calculatePopupPosition } from "@/content/suggestion-popup";
import type { EmojiMatchResponse } from "@/types";

console.log("[FB Emoji Suggest] Content script loaded");

const popup = new SuggestionPopup();
let cleanupMonitor: (() => void) | null = null;
let currentMatchedWord: string | null = null;

/**
 * Remove the typed word from the input and insert emoji using clipboard
 * This approach works better with Facebook's controlled contenteditable
 */
async function replaceWordWithEmoji(word: string, emoji: string): Promise<void> {
  const input = findChatInput();
  if (!input || !word) {
    document.execCommand("insertText", false, emoji);
    return;
  }

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    document.execCommand("insertText", false, emoji);
    return;
  }

  const textContent = input.textContent || "";
  const range = selection.getRangeAt(0);

  // Find where the cursor is in the text
  let cursorPos = 0;
  const walker = document.createTreeWalker(input, NodeFilter.SHOW_TEXT, null);
  let currentNode;
  while ((currentNode = walker.nextNode()) !== null) {
    if (currentNode === range.startContainer) {
      cursorPos += range.startOffset;
      break;
    }
    cursorPos += currentNode.textContent?.length || 0;
  }

  // Find the word before cursor
  const beforeCursor = textContent.substring(0, cursorPos);
  const wordIndex = beforeCursor.lastIndexOf(word);

  if (wordIndex !== -1) {
    // Select the word to replace
    const selectRange = document.createRange();

    // Find the text node for word start
    let pos = 0;
    walker.currentNode = input;
    walker.nextNode();
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;

    while ((currentNode = walker.currentNode) !== null) {
      const nodeText = currentNode.textContent || "";
      const nodeLen = nodeText.length;

      if (!startNode && pos + nodeLen >= wordIndex) {
        startNode = currentNode;
        startOffset = wordIndex - pos;
      }

      if (!endNode && pos + nodeLen >= wordIndex + word.length) {
        endNode = currentNode;
        endOffset = (wordIndex + word.length) - pos;
        break;
      }

      pos += nodeLen;
      walker.nextNode();
    }

    if (startNode && endNode) {
      selectRange.setStart(startNode, startOffset);
      selectRange.setEnd(endNode, endOffset);
      selection.removeAllRanges();
      selection.addRange(selectRange);

      // Save current clipboard content
      const previousClipboard = await navigator.clipboard.readText().catch(() => "");

      try {
        // Copy emoji to clipboard
        await navigator.clipboard.writeText(emoji);
        // Small delay to ensure clipboard is ready
        await new Promise(resolve => setTimeout(resolve, 10));
        // Paste using execCommand (simulates user paste action)
        document.execCommand("paste");
        // Restore previous clipboard content
        if (previousClipboard) {
          await navigator.clipboard.writeText(previousClipboard);
        }
        input.focus();
        return;
      } catch (e) {
        // Restore clipboard on error
        if (previousClipboard) {
          navigator.clipboard.writeText(previousClipboard);
        }

        // Fallback to keyboard simulation
        document.execCommand("delete");
        for (const char of emoji) {
          const keydownEvent = new KeyboardEvent("keydown", {
            key: char,
            code: `Key${char.toUpperCase()}`,
            keyCode: char.charCodeAt(0),
            which: char.charCodeAt(0),
            bubbles: true,
            cancelable: true,
          });
          input.dispatchEvent(keydownEvent);
          document.execCommand("insertText", false, char);
          const keyupEvent = new KeyboardEvent("keyup", {
            key: char,
            code: `Key${char.toUpperCase()}`,
            keyCode: char.charCodeAt(0),
            which: char.charCodeAt(0),
            bubbles: true,
            cancelable: true,
          });
          input.dispatchEvent(keyupEvent);
        }
      }
    }
  }

  // Ultimate fallback
  document.execCommand("insertText", false, emoji);
}

/**
 * Handle emoji selection
 */
function handleEmojiSelect(emoji: string): void {
  if (currentMatchedWord) {
    replaceWordWithEmoji(currentMatchedWord, emoji);
    currentMatchedWord = null;
  } else {
    document.execCommand("insertText", false, emoji);
  }
  popup.hide();
}

/**
 * Handle keyword match from input monitor
 */
async function handleKeywordMatch(
  response: EmojiMatchResponse,
  word: string
): Promise<void> {
  // Store the matched word so we can replace it when emoji is clicked
  currentMatchedWord = word;

  if (!response.matched || response.emojis.length === 0) {
    popup.hide();
    currentMatchedWord = null;
    return;
  }

  // Get input element for positioning
  const input = findChatInput();
  if (!input) {
    popup.hide();
    currentMatchedWord = null;
    return;
  }

  // Calculate position
  const position = calculatePopupPosition(input);

  // Show popup with emojis (no loading needed - instant response)
  popup.show(response.emojis, position, handleEmojiSelect);
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
