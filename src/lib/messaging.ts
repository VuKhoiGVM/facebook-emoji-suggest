import type { ExtensionMessage, EmojiMatchResponse } from "@/types";

/**
 * Send a message to the background script and wait for response
 */
export async function sendToBackground(
  message: ExtensionMessage
): Promise<EmojiMatchResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: EmojiMatchResponse) => {
      if (chrome.runtime.lastError) {
        console.warn("[FB Emoji Suggest] Message error:", chrome.runtime.lastError);
        resolve({ matched: false });
        return;
      }
      resolve(response ?? { matched: false });
    });
  });
}

/**
 * Listen for messages from content scripts
 */
export function onMessageFromContent(
  callback: (message: ExtensionMessage) => Promise<EmojiMatchResponse>
): void {
  chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
    callback(message).then(sendResponse);
    return true; // Keep channel open for async response
  }
);
}
