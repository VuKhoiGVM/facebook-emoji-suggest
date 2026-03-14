import { sendToBackground } from "@/lib/messaging";
import type { KeywordMatchResponse } from "@/types";

/**
 * Possible selectors for Facebook's chat input field
 * Facebook may change these, so we have multiple fallbacks
 */
const INPUT_SELECTORS = [
  '[contenteditable="true"][role="textbox"]',
  '[contenteditable="true"][data-lexical-editor="true"]',
  'div[contenteditable="true"]',
  '[role="textbox"][contenteditable="true"]',
];

/** Debounce timeout in ms */
const DEBOUNCE_MS = 150;

/** Minimum word length to trigger matching */
const MIN_WORD_LENGTH = 2;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentCallback: ((response: KeywordMatchResponse, word: string) => void) | null = null;

/**
 * Find the chat input field on the page
 */
export function findChatInput(): HTMLElement | null {
  for (const selector of INPUT_SELECTORS) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    // Return the first visible, editable element
    for (const el of elements) {
      if (el.offsetParent !== null && el.isContentEditable) {
        return el;
      }
    }
  }
  return null;
}

/**
 * Extract the current word being typed at cursor position
 */
function getCurrentWord(input: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "";

  const range = selection.getRangeAt(0);
  const textContent = input.textContent || "";
  const cursorOffset = range.startOffset;

  // Find word boundaries
  let start = cursorOffset;
  let end = cursorOffset;

  // Expand left until we hit a space or start of text
  while (start > 0 && !/\s/.test(textContent[start - 1])) {
    start--;
  }

  // Expand right until we hit a space or end of text
  while (end < textContent.length && !/\s/.test(textContent[end])) {
    end++;
  }

  return textContent.slice(start, end).trim();
}

/**
 * Handle input changes with debounce
 */
async function handleInput(input: HTMLElement): Promise<void> {
  if (!currentCallback) return;

  const word = getCurrentWord(input);

  // Don't trigger if word is too short
  if (word.length < MIN_WORD_LENGTH) {
    currentCallback({ matched: false }, word);
    return;
  }

  const response = await sendToBackground({ type: "MATCH_KEYWORD", word });
  currentCallback(response, word);
}

/**
 * Set up input monitoring on Facebook's chat
 */
export function setupInputMonitor(
  onKeywordMatch: (response: KeywordMatchResponse, word: string) => void
): (() => void) | null {
  const input = findChatInput();
  if (!input) {
    console.warn("[FB Emoji Suggest] Chat input not found");
    return null;
  }

  currentCallback = onKeywordMatch;

  const debouncedHandler = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => handleInput(input), DEBOUNCE_MS);
  };

  // Listen for input events
  input.addEventListener("input", debouncedHandler);
  input.addEventListener("keydown", debouncedHandler);

  console.log("[FB Emoji Suggest] Input monitor set up");

  // Return cleanup function
  return () => {
    input.removeEventListener("input", debouncedHandler);
    input.removeEventListener("keydown", debouncedHandler);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    currentCallback = null;
  };
}
