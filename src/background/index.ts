import { matchEmoji } from "@/lib/emoji-suggestions";
import type { ExtensionMessage, EmojiMatchResponse } from "@/types";

// Listen for messages from content script
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse) => {
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
