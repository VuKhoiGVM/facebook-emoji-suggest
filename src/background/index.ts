import { matchEmoji } from "@/lib/emoji-suggestions";
import type { ExtensionMessage, EmojiMatchResponse } from "@/types";

console.log("[FB Emoji Suggest] Background service worker loaded");

// Listen for messages from content script
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "MATCH_KEYWORD") {
      const emojis = matchEmoji(message.word);
      const response: EmojiMatchResponse = emojis
        ? { matched: true, emojis }
        : { matched: false };
      sendResponse(response);
    }

    return true; // Keep channel open for async response
  }
);
