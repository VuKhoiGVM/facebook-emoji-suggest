# Facebook Emoji Suggest Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that suggests Facebook stickers while typing in Messenger.

**Architecture:** Content script injects into facebook.com/messages, monitors chat input, shows Shadow DOM popup with sticker suggestions from Facebook's built-in sticker picker.

**Spec:** `docs/superpowers/specs/2026-03-14-facebook-emoji-suggest-design.md`

**Tech Stack:** TypeScript, Bun, Chrome Extension Manifest V3

---

## Chunk 1: Project Foundation

### Task 1.1: Create package.json
- [ ] Create `package.json` with the following content
- [ ] Verify `"type": "module"` is set

**File:** `package.json`
```json
{
  "name": "facebook-emoji-suggest",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run build.ts --watch",
    "build": "bun run build.ts"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.268",
    "bun-types": "^1.1.0",
    "typescript": "^5.3.0"
  }
}
```

---

### Task 1.2: Create TypeScript Configuration
- [ ] Create `tsconfig.json` with strict settings
- [ ] Enable DOM types for content script
- [ ] Target ES2022 for modern browser support

**File:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["chrome", "bun-types"],
    "lib": ["ES2022", "DOM"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "build.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Task 1.3: Create Chrome Extension Manifest
- [ ] Create `manifest.json` with Manifest V3
- [ ] Configure content script for facebook.com/messages
- [ ] Set up background service worker

**File:** `manifest.json`
```json
{
  "manifest_version": 3,
  "name": "Facebook Emoji Suggest",
  "version": "1.0.0",
  "description": "Suggest stickers while typing in Facebook Messenger",
  "permissions": ["activeTab"],
  "host_permissions": [
    "https://www.facebook.com/*",
    "https://facebook.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.facebook.com/messages/*",
        "https://facebook.com/messages/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

### Task 1.4: Create Build Script
- [ ] Create `build.ts` using Bun's build API
- [ ] Bundle background script to `dist/background.js`
- [ ] Bundle content script to `dist/content.js`
- [ ] Copy manifest and icons to `dist/`

**File:** `build.ts`
```typescript
import { $ } from "bun";

const isWatch = process.argv.includes("--watch");

async function build() {
  console.log("🔨 Building extension...");

  // Clean and create dist directory
  await $`rm -rf dist`.quiet();
  await $`mkdir -p dist/icons`.quiet();

  // Bundle background script
  const backgroundResult = await Bun.build({
    entrypoints: ["./src/background/index.ts"],
    outdir: "./dist",
    target: "browser",
    minify: !isWatch,
    sourcemap: isWatch ? "inline" : undefined,
  });

  if (!backgroundResult.success) {
    console.error("❌ Background build failed:", backgroundResult.logs);
    process.exit(1);
  }

  // Bundle content script
  const contentResult = await Bun.build({
    entrypoints: ["./src/content/index.ts"],
    outdir: "./dist",
    target: "browser",
    minify: !isWatch,
    sourcemap: isWatch ? "inline" : undefined,
  });

  if (!contentResult.success) {
    console.error("❌ Content build failed:", contentResult.logs);
    process.exit(1);
  }

  // Copy static files
  await $`cp manifest.json dist/`.quiet();
  await $`cp -r public/icons/* dist/icons/ 2>/dev/null || true`.quiet();

  console.log("✅ Build complete! Load dist/ folder in Chrome");
}

if (isWatch) {
  console.log("👀 Watching for changes...");
  // For watch mode, we'd need to set up file watching
  // For MVP, just run build once
}

build();
```

---

### Task 1.5: Create Directory Structure
- [ ] Create `src/` directory
- [ ] Create `src/background/` directory
- [ ] Create `src/content/` directory
- [ ] Create `src/content/suggestion-popup/` directory
- [ ] Create `src/lib/` directory
- [ ] Create `src/types/` directory
- [ ] Create `public/icons/` directory

---

### Task 1.6: Create Extension Icons
- [ ] Create `public/icons/` directory
- [ ] Create simple colored square icons using ImageMagick or online tool
- [ ] Generate 16x16, 32x32, 48x48, 128x128 PNG files

**Quick approach using ImageMagick (if installed):**
```bash
# Create a simple blue rounded square icon
for size in 16 32 48 128; do
  convert -size ${size}x${size} xc:'#1877F2' -fill white -gravity center \
    -pointsize $((size/2)) -annotate 0 '😀' public/icons/icon${size}.png
done
```

**Alternative: Use online tool like https://favicon.io/emoji-favicons/ to generate icons from 😀 emoji**

**Note:** These are placeholder icons for MVP. They can be improved later with proper design.

---

## Chunk 2: Types and Shared Utilities

### Task 2.1: Define TypeScript Types
- [ ] Create shared message types for background-content communication
- [ ] Define sticker data structure
- [ ] Export types for use across modules

**File:** `src/types/index.ts`
```typescript
/**
 * Message types for communication between background and content scripts
 */
export type ExtensionMessage =
  | { type: "MATCH_KEYWORD"; word: string }
  | { type: "KEYWORD_MATCHED"; searchTerm: string }
  | { type: "NO_MATCH" };

/**
 * Response type for keyword matching
 */
export type KeywordMatchResponse =
  | { matched: true; searchTerm: string }
  | { matched: false };

/**
 * Sticker data extracted from Facebook's picker
 */
export interface StickerData {
  element: HTMLElement;
  imageUrl: string;
  index: number;
}

/**
 * Popup position for rendering
 */
export interface PopupPosition {
  top: number;
  left: number;
}

/**
 * Content script state
 */
export interface ContentScriptState {
  isActive: boolean;
  currentWord: string;
  popupVisible: boolean;
}
```

---

### Task 2.2: Create Type-Safe Messaging Utilities
- [ ] Create wrapper for chrome.runtime.sendMessage with type safety
- [ ] Create wrapper for chrome.runtime.onMessage listener
- [ ] Add error handling for extension context invalidation

**File:** `src/lib/messaging.ts`
```typescript
import type { ExtensionMessage, KeywordMatchResponse } from "@/types";

/**
 * Send a message to the background script and wait for response
 */
export async function sendToBackground<T extends ExtensionMessage>(
  message: T
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
```

---

### Task 2.3: Verify TypeScript Compiles
- [ ] Run `bunx tsc --noEmit` to verify types are correct
- [ ] Fix any type errors before proceeding

---

## Chunk 3: Keyword Mapping System

### Task 3.1: Create Keyword Mappings
- [ ] Define 50+ keyword → search term mappings
- [ ] Organize by category (greetings, emotions, reactions, etc.)
- [ ] Use search terms optimized for Facebook sticker search

**File:** `src/lib/keywords.ts`
```typescript
/**
 * Keyword to sticker search term mappings
 * Keys are user input triggers, values are search terms for Facebook's sticker picker
 */
export const KEYWORDS: Record<string, string> = {
  // Greetings
  hi: "hello wave hi",
  hello: "hello wave hi",
  hey: "hello wave hey",
  yo: "yo hey whatsup",
  sup: "sup whatsup yo",

  // Farewells
  bye: "goodbye bye wave",
  cya: "goodbye see you cya",
  goodbye: "goodbye bye wave",
  goodnight: "good night sleep moon",
  gn: "good night sleep",

  // Positive Emotions
  love: "love heart romantic",
  lovely: "love heart romantic",
  thanks: "thank you grateful thanks",
  thx: "thank you thanks",
  ty: "thank you ty",
  wow: "wow amazing impressed",
  amazing: "wow amazing impressed",
  omg: "omg shocked surprised",
  lol: "laugh funny lol haha",
  haha: "laugh funny haha lol",
  lmao: "laugh funny lmao",
  rofl: "laugh funny rofl",
  hehe: "laugh funny hehe",
  yay: "yay happy celebrate",
  yayy: "yay happy celebrate",
  yayyy: "yay celebrate happy",
  nice: "nice cool great",
  great: "nice great cool",
  awesome: "awesome cool great",
  cool: "cool nice awesome",
  perfect: "perfect great amazing",

  // Negative Emotions
  sad: "sad crying upset",
  crying: "sad crying tears",
  sorry: "sorry apologize sad",
  no: "no nope reject",
  nope: "no nope reject",
  angry: "angry mad upset",
  mad: "angry mad upset",
  upset: "sad upset angry",
  cry: "sad crying tears",
  disappointed: "sad disappointed upset",
  angryface: "angry mad rage",

  // Reactions
  yes: "yes ok agree thumbs up",
  yup: "yes yup agree",
  ok: "ok okay yes",
  okay: "ok okay yes",
  sure: "sure yes ok",
  agree: "agree yes thumbs up",

  // Expressions
  wtf: "confused what wtf shocked",
  oops: "oops mistake sorry",
  rip: "rip sad goodbye",
  brb: "brb wait be right back",
  afk: "afk away brb",
  idk: "idk confused shrug",
  tbh: "tbh honest truth",
  btw: "btw by the way",
  omw: "omw on my way",
  nvm: "nvm never mind",

  // Common Phrases
  please: "please beg request",
  pls: "please pls beg",
  help: "help confused question",
  wait: "wait hold on patience",
  thinking: "thinking hmm consider",
  hmm: "thinking hmm consider",
  shrug: "shrug idk whatever",
  whatever: "whatever shrug",

  // Celebrations
  congrats: "congratulations congrats celebrate",
  congratz: "congratulations congrats",
  congratulations: "congratulations congrats celebrate",
  hbd: "happy birthday cake",
  birthday: "happy birthday cake",
  happy: "happy smile celebrate",
};

/**
 * Match user input against keyword database
 * Supports exact match and partial match (prefix-based)
 */
export function matchKeyword(input: string): string | null {
  const normalized = input.toLowerCase().trim();

  // 1. Exact match (fastest, highest priority)
  if (KEYWORDS[normalized]) {
    return KEYWORDS[normalized];
  }

  // 2. Partial match - find keywords that start with input
  // Only trigger if input is at least 2 characters to avoid noise
  if (normalized.length >= 2) {
    const partialMatches = Object.keys(KEYWORDS).filter((keyword) =>
      keyword.startsWith(normalized)
    );

    // If only one match, use it directly
    if (partialMatches.length === 1) {
      return KEYWORDS[partialMatches[0]];
    }

    // If multiple matches, combine search terms (deduplicated)
    if (partialMatches.length > 1) {
      const searchTerms = partialMatches
        .map((k) => KEYWORDS[k])
        .join(" ")
        .split(" ")
        .filter((word, index, self) => self.indexOf(word) === index)
        .slice(0, 5)
        .join(" ");
      return searchTerms || null;
    }
  }

  return null;
}
```

---

## Chunk 4: Background Service Worker

### Task 4.1: Create Background Script
- [ ] Set up message listener for keyword matching
- [ ] Handle MATCH_KEYWORD messages
- [ ] Return KEYWORD_MATCHED or NO_MATCH response

**File:** `src/background/index.ts`
```typescript
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
```

---

## Chunk 5: Content Script - Input Monitoring

### Task 5.1: Create Input Monitor Module
- [ ] Find Facebook's chat input field
- [ ] Monitor input changes with debounce
- [ ] Extract current word being typed
- [ ] Detect trigger keywords

**File:** `src/content/input-monitor.ts`
```typescript
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
```

---

## Chunk 6: Content Script - Sticker Picker Integration

### Task 6.1: Create Sticker Picker Module
- [ ] Find Facebook's sticker button
- [ ] Open sticker picker programmatically
- [ ] Search for stickers using Facebook's search
- [ ] Extract sticker elements and URLs
- [ ] Click sticker to send

**File:** `src/content/sticker-picker.ts`
```typescript
import type { StickerData } from "@/types";

/**
 * Possible selectors for Facebook's sticker/emoji button
 */
const STICKER_BUTTON_SELECTORS = [
  '[aria-label*="sticker" i]',
  '[aria-label*="emoji" i]',
  '[aria-label*="GIF" i]',
  'img[alt*="sticker" i]',
  '[data-testid*="sticker"]',
];

/**
 * Possible selectors for sticker picker panel
 */
const PICKER_PANEL_SELECTORS = [
  '[role="dialog"]',
  '[data-testid*="picker"]',
  '[class*="sticker"]',
];

/**
 * Possible selectors for search input in picker
 */
const SEARCH_INPUT_SELECTORS = [
  'input[placeholder*="search" i]',
  'input[placeholder*="Search" i]',
  'input[type="text"]',
];

/** Time to wait for UI animations */
const ANIMATION_DELAY_MS = 300;

/** Time to wait for search results */
const SEARCH_DELAY_MS = 500;

/** Maximum stickers to show */
const MAX_STICKERS = 8;

/** Timeout for operations */
const TIMEOUT_MS = 3000;

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for an element to appear
 */
async function waitForElement(
  selectors: string[],
  timeout = TIMEOUT_MS
): Promise<HTMLElement | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      const el = document.querySelector<HTMLElement>(selector);
      if (el && el.offsetParent !== null) {
        return el;
      }
    }
    await sleep(100);
  }

  return null;
}

/**
 * Find the sticker button in Facebook's chat bar
 */
export function findStickerButton(): HTMLElement | null {
  for (const selector of STICKER_BUTTON_SELECTORS) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    for (const el of elements) {
      // Check if it's in the chat input area (bottom of page)
      const rect = el.getBoundingClientRect();
      if (rect.bottom > window.innerHeight * 0.5) {
        return el;
      }
    }
  }
  return null;
}

/**
 * Open Facebook's sticker picker
 */
export async function openStickerPicker(): Promise<boolean> {
  const btn = findStickerButton();
  if (!btn) {
    console.warn("[FB Emoji Suggest] Sticker button not found");
    return false;
  }

  btn.click();
  await sleep(ANIMATION_DELAY_MS);
  return true;
}

/**
 * Close the sticker picker
 */
export async function closeStickerPicker(): Promise<void> {
  // Try pressing Escape to close
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  await sleep(ANIMATION_DELAY_MS / 2);

  // Also try clicking outside
  const picker = await waitForElement(PICKER_PANEL_SELECTORS, 100);
  if (picker) {
    // Click on body to close
    document.body.click();
  }
}

/**
 * Search for stickers in Facebook's picker
 */
export async function searchStickers(searchTerm: string): Promise<boolean> {
  const searchInput = await waitForElement(SEARCH_INPUT_SELECTORS, TIMEOUT_MS);
  if (!searchInput) {
    console.warn("[FB Emoji Suggest] Search input not found in picker");
    return false;
  }

  // Clear previous input and type new search
  (searchInput as HTMLInputElement).value = "";
  (searchInput as HTMLInputElement).focus();

  // Set value and dispatch events to trigger Facebook's search
  (searchInput as HTMLInputElement).value = searchTerm;
  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  searchInput.dispatchEvent(new Event("change", { bubbles: true }));

  await sleep(SEARCH_DELAY_MS);
  return true;
}

/**
 * Extract sticker elements from the picker
 */
export function extractStickers(): StickerData[] {
  const stickers: StickerData[] = [];

  // Look for sticker images in the picker panel
  const stickerImages = document.querySelectorAll<HTMLImageElement>(
    'img[alt*="sticker" i], img[src*="sticker"], [role="button"] img'
  );

  for (let i = 0; i < Math.min(stickerImages.length, MAX_STICKERS); i++) {
    const img = stickerImages[i];
    const parent = img.closest('[role="button"]') || img.parentElement;

    if (parent && img.src) {
      stickers.push({
        element: parent as HTMLElement,
        imageUrl: img.src,
        index: i,
      });
    }
  }

  return stickers;
}

/**
 * Click a sticker to send it
 */
export async function clickSticker(sticker: StickerData): Promise<boolean> {
  try {
    sticker.element.click();
    await sleep(ANIMATION_DELAY_MS);
    await closeStickerPicker();
    return true;
  } catch (error) {
    console.warn("[FB Emoji Suggest] Failed to click sticker:", error);
    return false;
  }
}

/**
 * Full flow: search and get stickers
 */
export async function getStickersForTerm(searchTerm: string): Promise<StickerData[]> {
  // Open picker
  const opened = await openStickerPicker();
  if (!opened) return [];

  // Search
  const searched = await searchStickers(searchTerm);
  if (!searched) {
    await closeStickerPicker();
    return [];
  }

  // Extract stickers
  const stickers = extractStickers();

  if (stickers.length === 0) {
    await closeStickerPicker();
  }

  return stickers;
}
```

---

## Chunk 7: Content Script - Suggestion Popup

### Task 7.1: Create Popup Module
- [ ] Create Shadow DOM container
- [ ] Render sticker grid
- [ ] Handle sticker click events
- [ ] Position popup above chat input
- [ ] Handle close on Escape/click outside
- [ ] Inline CSS styles as a string constant (Bun doesn't bundle CSS imports by default)

**File:** `src/content/suggestion-popup/index.ts`
```typescript
import type { StickerData, PopupPosition } from "@/types";
import { closeStickerPicker } from "@/content/sticker-picker";

// Inline CSS to avoid bundler issues with CSS imports
const STYLES = `
/* Shadow DOM isolated styles */
:host {
  all: initial;
}

.popup-container {
  position: absolute;
  background: var(--popup-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 8px;
  z-index: 2147483647;
  animation: fadeIn 0.15s ease-out;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.popup-container.dark {
  --popup-bg: #242526;
  --sticker-hover-bg: rgba(255, 255, 255, 0.1);
}

.sticker-grid {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-width: 320px;
}

.sticker-item {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  padding: 4px;
  transition: transform 0.1s ease, background 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sticker-item:hover {
  transform: scale(1.1);
  background: var(--sticker-hover-bg, rgba(0, 0, 0, 0.05));
}

.sticker-item:active {
  transform: scale(0.95);
}

.sticker-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.loading {
  padding: 12px 16px;
  color: var(--loading-color, #65676b);
  font-size: 14px;
}

.popup-container.dark .loading {
  --loading-color: #b0b3b8;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

const POPUP_ID = "fs-suggestion-popup";

/** Minimum distance from viewport edges */
const VIEWPORT_PADDING = 16;

/**
 * Create the popup container with Shadow DOM
 */
function createPopupContainer(): { container: HTMLDivElement; shadow: ShadowRoot } {
  const container = document.createElement("div");
  container.id = POPUP_ID;

  const shadow = container.attachShadow({ mode: "closed" });

  // Inject styles
  const styleEl = document.createElement("style");
  styleEl.textContent = STYLES;
  shadow.appendChild(styleEl);

  return { container, shadow };
}

/**
 * Check if Facebook is in dark mode
 */
function isDarkMode(): boolean {
  return document.documentElement.getAttribute("data-theme") === "dark" ||
    document.body.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Calculate popup position above chat input
 */
export function calculatePopupPosition(inputElement: HTMLElement): PopupPosition {
  const rect = inputElement.getBoundingClientRect();
  const scrollTop = window.scrollY;
  const scrollLeft = window.scrollX;

  // Position above the input
  let top = rect.top + scrollTop - 80; // 80px above (popup height + margin)
  let left = rect.left + scrollLeft;

  // Ensure popup stays within viewport
  const viewportWidth = window.innerWidth;
  const popupWidth = 320; // max-width from CSS

  if (left + popupWidth > viewportWidth - VIEWPORT_PADDING) {
    left = viewportWidth - popupWidth - VIEWPORT_PADDING;
  }

  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING;
  }

  // If not enough space above, position below
  if (top < VIEWPORT_PADDING + scrollTop) {
    top = rect.bottom + scrollTop + 8; // 8px below input
  }

  return { top, left };
}

/**
 * Create sticker button element
 */
function createStickerButton(
  sticker: StickerData,
  onClick: (sticker: StickerData) => void
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "sticker-item";
  btn.setAttribute("aria-label", `Select sticker ${sticker.index + 1}`);

  const img = document.createElement("img");
  img.src = sticker.imageUrl;
  img.alt = "Sticker";
  img.loading = "lazy";

  btn.appendChild(img);
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(sticker);
  });

  return btn;
}

/**
 * Suggestion Popup class
 */
export class SuggestionPopup {
  private container: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private onStickerSelect?: (sticker: StickerData) => void;

  /**
   * Show the popup with stickers
   */
  show(
    stickers: StickerData[],
    position: PopupPosition,
    onStickerSelect: (sticker: StickerData) => void
  ): void {
    this.hide();
    this.onStickerSelect = onStickerSelect;

    const { container, shadow } = createPopupContainer();
    this.container = container;
    this.shadow = shadow;

    // Create popup content
    const popupEl = document.createElement("div");
    popupEl.className = `popup-container${isDarkMode() ? " dark" : ""}`;
    popupEl.style.top = `${position.top}px`;
    popupEl.style.left = `${position.left}px`;

    // Create sticker grid
    const grid = document.createElement("div");
    grid.className = "sticker-grid";

    for (const sticker of stickers) {
      const btn = createStickerButton(sticker, this.handleStickerClick.bind(this));
      grid.appendChild(btn);
    }

    popupEl.appendChild(grid);
    shadow.appendChild(popupEl);
    document.body.appendChild(container);

    // Set up close handlers
    this.setupCloseHandlers();
  }

  /**
   * Show loading state
   */
  showLoading(position: PopupPosition): void {
    this.hide();

    const { container, shadow } = createPopupContainer();
    this.container = container;
    this.shadow = shadow;

    const popupEl = document.createElement("div");
    popupEl.className = `popup-container${isDarkMode() ? " dark" : ""}`;
    popupEl.style.top = `${position.top}px`;
    popupEl.style.left = `${position.left}px`;

    const loadingEl = document.createElement("div");
    loadingEl.className = "loading";
    loadingEl.textContent = "Loading stickers...";

    popupEl.appendChild(loadingEl);
    shadow.appendChild(popupEl);
    document.body.appendChild(container);
  }

  /**
   * Hide the popup
   */
  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.shadow = null;
    }
  }

  /**
   * Check if popup is visible
   */
  isVisible(): boolean {
    return this.container !== null && document.body.contains(this.container);
  }

  /**
   * Handle sticker click
   */
  private async handleStickerClick(sticker: StickerData): Promise<void> {
    this.hide();

    if (this.onStickerSelect) {
      this.onStickerSelect(sticker);
    }
  }

  /**
   * Set up handlers to close popup
   */
  private setupCloseHandlers(): void {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.hide();
        document.removeEventListener("keydown", handleEscape);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (this.container && !this.container.contains(e.target as Node)) {
        this.hide();
        document.removeEventListener("click", handleClickOutside);
        closeStickerPicker();
      }
    };

    // Delay to avoid immediate close
    setTimeout(() => {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("click", handleClickOutside);
    }, 100);
  }
}
```

---

## Chunk 8: Content Script - Main Entry

### Task 8.1: Create Content Script Entry Point
- [ ] Initialize input monitor
- [ ] Create suggestion popup instance
- [ ] Handle keyword matches
- [ ] Show popup with stickers
- [ ] Handle sticker selection (send + clear text)
- [ ] Set up MutationObserver for Facebook's dynamic navigation

**File:** `src/content/index.ts`
```typescript
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
```

---

## Chunk 9: Unit Tests

### Task 9.1: Create Test File for Keywords
- [ ] Set up Bun test file
- [ ] Test exact match returns correct term
- [ ] Test partial match returns combined terms
- [ ] Test no match returns null
- [ ] Test case insensitive matching
- [ ] Test minimum length requirement

**File:** `tests/keywords.test.ts`
```typescript
import { describe, test, expect } from "bun:test";
import { matchKeyword, KEYWORDS } from "@/lib/keywords";

describe("matchKeyword", () => {
  describe("exact match", () => {
    test("returns correct search term for 'hi'", () => {
      expect(matchKeyword("hi")).toBe(KEYWORDS["hi"]);
    });

    test("returns correct search term for 'love'", () => {
      expect(matchKeyword("love")).toBe(KEYWORDS["love"]);
    });

    test("returns correct search term for 'lol'", () => {
      expect(matchKeyword("lol")).toBe(KEYWORDS["lol"]);
    });
  });

  describe("case insensitive", () => {
    test("matches uppercase input", () => {
      expect(matchKeyword("HI")).toBe(KEYWORDS["hi"]);
    });

    test("matches mixed case input", () => {
      expect(matchKeyword("LoVe")).toBe(KEYWORDS["love"]);
    });

    test("matches with trailing spaces", () => {
      expect(matchKeyword("  hi  ")).toBe(KEYWORDS["hi"]);
    });
  });

  describe("partial match", () => {
    test("returns match for 'lov' (partial of 'love')", () => {
      const result = matchKeyword("lov");
      expect(result).not.toBeNull();
      expect(result).toContain("love");
    });

    test("returns combined terms for multiple matches", () => {
      const result = matchKeyword("ha");
      expect(result).not.toBeNull();
      // Should include terms from haha, happy, etc.
    });

    test("returns null for single character input", () => {
      expect(matchKeyword("h")).toBeNull();
    });
  });

  describe("no match", () => {
    test("returns null for unknown word", () => {
      expect(matchKeyword("xyzabc123")).toBeNull();
    });

    test("returns null for empty string", () => {
      expect(matchKeyword("")).toBeNull();
    });

    test("returns null for single space", () => {
      expect(matchKeyword(" ")).toBeNull();
    });
  });

  describe("keyword database", () => {
    test("has at least 50 keywords", () => {
      const keywordCount = Object.keys(KEYWORDS).length;
      expect(keywordCount).toBeGreaterThanOrEqual(50);
    });

    test("all keywords map to non-empty strings", () => {
      for (const [key, value] of Object.entries(KEYWORDS)) {
        expect(value).toBeTruthy();
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });
});
```

---

### Task 9.2: Add Test Script to package.json
- [ ] Add `"test": "bun test"` to the scripts section of package.json

**Note:** This is an update to the existing `package.json` created in Task 1.1. Just add the test line to the scripts object.

---

## Chunk 10: Final Polish and Testing

### Task 10.1: Create .gitignore
- [ ] Ignore node_modules, dist, and IDE files

**File:** `.gitignore`
```
# Dependencies
node_modules/

# Build output
dist/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
```

---

### Task 10.2: Create README
- [ ] Document how to build and install the extension

**File:** `README.md`
```markdown
# Facebook Emoji Suggest

A Chrome extension that suggests stickers while typing in Facebook Messenger.

## Installation

### Development

1. Install dependencies:
   ```bash
   bun install
   ```

2. Build the extension:
   ```bash
   bun run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

### Testing

```bash
bun test
```

## Usage

1. Go to [facebook.com/messages](https://www.facebook.com/messages)
2. Start typing a message
3. Type a trigger word like "hi", "love", "lol", etc.
4. A popup will appear with sticker suggestions
5. Click a sticker to send it

## Supported Triggers

The extension supports 50+ trigger words including:
- Greetings: hi, hello, hey, yo
- Emotions: love, happy, sad, angry
- Reactions: lol, haha, wow, omg
- And many more...

## License

MIT
```

---

### Task 10.3: Manual Testing Checklist
- [ ] Extension loads without errors in chrome://extensions
- [ ] Typing "hi" in Facebook Messenger shows sticker suggestions
- [ ] Clicking a sticker sends it and clears the text
- [ ] Popup positions correctly above chat bar
- [ ] Popup closes on Escape key
- [ ] Popup closes on click outside
- [ ] Works with Facebook dark mode
- [ ] Works on new conversation
- [ ] Works on existing conversation
- [ ] Extension survives Facebook navigation (switching chats)

---

## Implementation Order

1. **Chunk 1**: Project Foundation (package.json, tsconfig, manifest, build script)
2. **Chunk 2**: Types and Utilities
3. **Chunk 3**: Keyword Mapping System
4. **Chunk 4**: Background Service Worker
5. **Chunk 5**: Input Monitoring
6. **Chunk 6**: Sticker Picker Integration
7. **Chunk 7**: Suggestion Popup
8. **Chunk 8**: Content Script Entry
9. **Chunk 9**: Unit Tests
10. **Chunk 10**: Final Polish

---

## Notes for Implementer

1. **Facebook Selectors**: The DOM selectors for Facebook's UI may need adjustment. Use browser DevTools to inspect elements if the defaults don't work.

2. **Shadow DOM**: The popup uses Shadow DOM to isolate styles. This prevents Facebook's CSS from affecting our popup.

3. **Debounce**: Input is debounced (150ms) to avoid excessive processing while typing fast.

4. **Error Handling**: All errors are caught and logged. The extension should never break the user's chat experience.

5. **Dark Mode**: The popup automatically detects and adapts to Facebook's dark mode.

6. **Navigation**: Facebook uses client-side routing. A MutationObserver watches for URL changes and re-initializes the extension.
