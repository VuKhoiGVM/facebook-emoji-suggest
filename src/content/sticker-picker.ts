import type { StickerData } from "@/types";

/**
 * Possible selectors for Facebook's sticker/emoji button
 */
const STICKER_BUTTON_SELECTORS = [
  // Try to find the smiley/emoji/sticker button (not GIF)
  '[aria-label*="smiley" i]',
  '[aria-label*="emoji" i]',
  '[aria-label*="sticker" i]',
  'svg[class*="emoji" i]',
  'img[alt*="emoji" i]',
  'img[alt*="sticker" i]',
  // Fallback: look for buttons near the chat input with emoji-related content
  '[role="button"] svg[class*="emoji" i]',
  // Last resort: any button with smiley face (might be GIF, but worth trying)
  '[role="button"] svg path[d*="M20 5.9L8 16c-1-3-3-7-3-10s2-7 3-10c0 3-2 7-3 10l12 10.1z"]', // smiley face SVG path
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
  'input[placeholder*="Tìm" i]',  // Vietnamese
  'input[placeholder*="Buscar" i]',  // Spanish
  'input[placeholder*="Suche" i]',  // German
  'input[placeholder*="Rechercher" i]',  // French
  'input[placeholder*="Cerca" i]',  // Italian
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

/** Lock to prevent concurrent sticker fetching */
let isFetchingStickers = false;

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
  console.log("[FB Emoji Suggest] DEBUG: Searching for sticker button...");

  // First, try to find the container with all chat toolbar buttons
  // Facebook typically has: Text, GIF, Sticker, Emoji, Attach buttons
  const chatToolbarSelectors = [
    '[aria-label="Messenger"] [role="toolbar"]',
    '[role="toolbar"] [aria-label="Actions"]',
    // Vietnamese: "Hành động" = Actions
    '[role="toolbar"] [aria-label="Hành động"]',
  ];

  for (const toolbarSelector of chatToolbarSelectors) {
    const toolbar = document.querySelector<HTMLElement>(toolbarSelector);
    if (toolbar) {
      console.log(`[FB Emoji Suggest] DEBUG: Found toolbar: ${toolbarSelector}`);

      // Look for button with emoji/smiley icon in the toolbar
      const buttons = toolbar.querySelectorAll<HTMLElement>('[role="button"], button');
      console.log(`[FB Emoji Suggest] DEBUG: Found ${buttons.length} buttons in toolbar`);

      for (const btn of buttons) {
        const label = btn.getAttribute('aria-label') || '';
        const html = btn.innerHTML.toLowerCase();

        console.log(`[FB Emoji Suggest] DEBUG: Button aria-label: "${label}"`);

        // Look for button with emoji/sticker in the label
        if (label.toLowerCase().includes('sticker') ||
            label.toLowerCase().includes('messenger') ||
            html.includes('emoji') ||
            html.includes('smiley')) {
          console.log(`[FB Emoji Suggest] DEBUG: FOUND sticker button via toolbar search`);
          return btn;
        }
      }
    }
  }

  // Fallback to original selector search
  for (const selector of STICKER_BUTTON_SELECTORS) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    console.log(`[FB Emoji Suggest] DEBUG: Selector "${selector}" found ${elements.length} elements`);
    for (const el of elements) {
      // Check if it's in the chat input area (bottom of page)
      const rect = el.getBoundingClientRect();
      if (rect.bottom > window.innerHeight * 0.5) {
        console.log(`[FB Emoji Suggest] DEBUG: FOUND sticker button using selector: ${selector}`);
        return el;
      }
    }
  }

  console.log("[FB Emoji Suggest] DEBUG: No sticker button found");
  return null;
}

/**
 * Open Facebook's sticker picker
 */
export async function openStickerPicker(): Promise<boolean> {
  console.log("[FB Emoji Suggest] DEBUG: Attempting to find sticker button...");
  const btn = findStickerButton();
  if (!btn) {
    console.warn("[FB Emoji Suggest] Sticker button not found");
    return false;
  }

  console.log("[FB Emoji Suggest] DEBUG: Sticker button found, clicking...");
  btn.click();
  await sleep(ANIMATION_DELAY_MS);
  console.log("[FB Emoji Suggest] DEBUG: Clicked sticker button, waiting for picker...");
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
  console.log("[FB Emoji Suggest] DEBUG: Searching for stickers with term:", searchTerm);
  const searchInput = await waitForElement(SEARCH_INPUT_SELECTORS, TIMEOUT_MS);
  if (!searchInput) {
    console.warn("[FB Emoji Suggest] Search input not found in picker");
    return false;
  }

  console.log("[FB Emoji Suggest] DEBUG: Search input found:", searchInput);
  // Clear previous input and type new search
  (searchInput as HTMLInputElement).value = "";
  (searchInput as HTMLInputElement).focus();

  // Set value and dispatch events to trigger Facebook's search
  (searchInput as HTMLInputElement).value = searchTerm;
  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  searchInput.dispatchEvent(new Event("change", { bubbles: true }));

  console.log("[FB Emoji Suggest] DEBUG: Waiting for search results...");
  await sleep(SEARCH_DELAY_MS);
  return true;
}

/**
 * Extract sticker elements from the picker
 */
export function extractStickers(): StickerData[] {
  console.log("[FB Emoji Suggest] DEBUG: Extracting stickers from DOM...");
  const stickers: StickerData[] = [];

  // Look for sticker images in the picker panel
  const stickerImages = document.querySelectorAll<HTMLImageElement>(
    'img[alt*="sticker" i], img[src*="sticker"], [role="button"] img'
  );

  console.log(`[FB Emoji Suggest] DEBUG: Found ${stickerImages.length} potential sticker images`);

  for (let i = 0; i < Math.min(stickerImages.length, MAX_STICKERS); i++) {
    const img = stickerImages[i];
    const parent = img.closest('[role="button"]') || img.parentElement;

    console.log(`[FB Emoji Suggest] DEBUG: Image ${i}: src="${img.src.substring(0, 50)}...", hasParent=${!!parent}, hasSrc=${!!img.src}`);

    if (parent && img.src) {
      stickers.push({
        element: parent as HTMLElement,
        imageUrl: img.src,
        index: i,
      });
    }
  }

  console.log(`[FB Emoji Suggest] DEBUG: Extracted ${stickers.length} stickers`);
  return stickers;
}

/**
 * Check if the sticker picker panel is already open
 */
function isPickerOpen(): boolean {
  for (const selector of PICKER_PANEL_SELECTORS) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el.offsetParent !== null) {
      return true;
    }
  }
  return false;
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
 * Check if the sticker picker panel is already open
 */
function isPickerOpen(): boolean {
  for (const selector of PICKER_PANEL_SELECTORS) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el.offsetParent !== null) {
      return true;
    }
  }
  return false;
}

/**
 * Full flow: search and get stickers
 */
export async function getStickersForTerm(searchTerm: string): Promise<StickerData[]> {
  console.log("[FB Emoji Suggest] DEBUG: === getStickersForTerm START ===");
  console.log("[FB Emoji Suggest] DEBUG: Search term:", searchTerm);
  console.log("[FB Emoji Suggest] DEBUG: isFetchingStickers lock:", isFetchingStickers);
  console.log("[FB Emoji Suggest] DEBUG: isPickerOpen:", isPickerOpen());

  // Prevent concurrent calls
  if (isFetchingStickers) {
    console.log("[FB Emoji Suggest] DEBUG: Already fetching stickers, skipping duplicate call");
    return [];
  }

  isFetchingStickers = true;

  try {
    // Only open picker if not already open
    if (!isPickerOpen()) {
      const opened = await openStickerPicker();
      if (!opened) {
        console.log("[FB Emoji Suggest] DEBUG: Failed to open picker");
        return [];
      }
      // Wait extra time for picker to fully load after opening
      await sleep(500);
    } else {
      console.log("[FB Emoji Suggest] DEBUG: Picker already open, skipping open step");
    }

    // Search
    const searched = await searchStickers(searchTerm);
    if (!searched) {
      console.log("[FB Emoji Suggest] DEBUG: Failed to search stickers");
      await closeStickerPicker();
      return [];
    }

    // Extract stickers
    const stickers = extractStickers();

    console.log(`[FB Emoji Suggest] DEBUG: Final sticker count: ${stickers.length}`);

    if (stickers.length === 0) {
      console.log("[FB Emoji Suggest] DEBUG: No stickers found, closing picker");
      await closeStickerPicker();
    }

    console.log("[FB Emoji Suggest] DEBUG: === getStickersForTerm END ===");
    return stickers;
  } finally {
    // Always release the lock
    isFetchingStickers = false;
  }
}
