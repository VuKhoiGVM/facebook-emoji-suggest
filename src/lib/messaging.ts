import type { ExtensionMessage, KeywordMatchResponse } from "@/types";

/**
 * Send a message to the background script and wait for response
 */
export async function sendToBackground(
  message: ExtensionMessage
): Promise<KeywordMatchResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: KeywordMatchResponse) => {
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
  callback: (message: ExtensionMessage) => Promise<KeywordMatchResponse>
): void {
  chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, _sender, sendResponse) => {
    callback(message).then(sendResponse);
    return true; // Keep channel open for async response
  }
);
}
