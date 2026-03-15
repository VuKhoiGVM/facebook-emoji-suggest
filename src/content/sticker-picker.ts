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
      // Look for button with emoji/smiley icon in the toolbar
      const buttons = toolbar.querySelectorAll<HTMLElement>('[role="button"], button');

      for (const btn of buttons) {
        const label = btn.getAttribute('aria-label') || '';
        const html = btn.innerHTML.toLowerCase();

        // Look for button with emoji/sticker in the label
        if (label.toLowerCase().includes('sticker') ||
            label.toLowerCase().includes('messenger') ||
            html.includes('emoji') ||
            html.includes('smiley')) {
          return btn;
        }
      }
    }
  }

  // Fallback to original selector search
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
 * Full flow: search and get stickers
 */
export async function getStickersForTerm(searchTerm: string): Promise<StickerData[]> {
  // Prevent concurrent calls
  if (isFetchingStickers) {
    return [];
  }

  isFetchingStickers = true;

  try {
    // Only open picker if not already open
    if (!isPickerOpen()) {
      const opened = await openStickerPicker();
      if (!opened) {
        return [];
      }
      // Wait extra time for picker to fully load after opening
      await sleep(500);
    }

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
  } finally {
    // Always release the lock
    isFetchingStickers = false;
  }
}
