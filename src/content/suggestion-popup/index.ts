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
