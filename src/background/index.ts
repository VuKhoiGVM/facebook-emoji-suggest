import { matchKeyword } from "@/lib/keywords";
import type { ExtensionMessage, KeywordMatchResponse } from "@/types";

console.log("[FB Emoji Suggest] Background service worker loaded");

// Listen for messages from content script
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "MATCH_KEYWORD") {
      const searchTerm = matchKeyword(message.word);

      const response: KeywordMatchResponse = searchTerm
        ? { matched: true, searchTerm }
        : { matched: false };

      sendResponse(response);
    }

    return true; // Keep channel open for async response
  }
);
