import type { PopupPosition } from "@/types";

// Inline CSS to avoid bundler issues with CSS imports
const STYLES = `
/* Shadow DOM isolated styles */
:host {
  all: initial;
}

.popup-container {
  background: var(--popup-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 6px;
  animation: fadeIn 0.15s ease-out;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  pointer-events: auto;
}

.popup-container.dark {
  --popup-bg: #242526;
  --emoji-hover-bg: rgba(255, 255, 255, 0.1);
}

.emoji-grid {
  display: flex;
  gap: 0;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 400px;
  min-width: 200px;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  pointer-events: auto;
  padding-left: 4px;
}

.emoji-grid::-webkit-scrollbar {
  height: 6px;
}

.emoji-grid::-webkit-scrollbar-track {
  background: transparent;
}

.emoji-grid::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.emoji-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.emoji-row {
  display: flex;
  gap: 4px;
  padding: 4px 4px 4px 8px;
  flex-shrink: 0;
}

.emoji-item {
  width: auto;
  min-width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  padding: 0 8px;
  transition: transform 0.1s ease, background 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  line-height: 1;
  user-select: none;
  white-space: nowrap;
  pointer-events: auto;
  flex-shrink: 0;
  scroll-snap-align: start;
  position: relative;
  z-index: 1;
}

.emoji-item.kaomoji {
  font-size: 11px;
  min-width: fit-content;
  max-width: none;
  padding: 0 10px;
}

.emoji-item:not(.kaomoji) {
  flex-shrink: 0;
}

.emoji-item:hover {
  transform: scale(1.1);
  background: var(--emoji-hover-bg, rgba(0, 0, 0, 0.05));
}

.emoji-item:active {
  transform: scale(0.95);
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

  // Apply container styles directly
  container.style.position = "fixed";
  container.style.zIndex = "999999999";
  container.style.pointerEvents = "auto";

  const shadow = container.attachShadow({ mode: "open" });

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
 * Detect if string is kaomoji (longer or contains special characters)
 */
function isKaomoji(str: string): boolean {
  return str.length > 5 || /[\(\)╯┻━┬┌┐└┛ノヽﾐ￣皿°□＿：；]/.test(str);
}

/**
 * Create emoji button element
 */
function createEmojiButton(
  emoji: string,
  onClick: (emoji: string) => void
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "emoji-item";

  // Detect kaomoji (longer strings, contains special characters)
  if (isKaomoji(emoji)) {
    btn.classList.add("kaomoji");
  }

  btn.setAttribute("aria-label", `Select emoji ${emoji}`);
  btn.textContent = emoji;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    onClick(emoji);
  });

  return btn;
}

/**
 * Suggestion Popup class
 */
export class SuggestionPopup {
  private container: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private onEmojiSelect?: (emoji: string) => void;
  private clickOutsideHandler?: ((e: MouseEvent) => void);
  private escapeHandler?: ((e: KeyboardEvent) => void);

  /**
   * Show the popup with emojis
   */
  show(
    emojis: string[],
    position: PopupPosition,
    onEmojiSelect: (emoji: string) => void
  ): void {
    this.hide();
    this.onEmojiSelect = onEmojiSelect;

    const { container, shadow } = createPopupContainer();
    this.container = container;
    this.shadow = shadow;

    // Apply position to container (not popupEl inside shadow)
    container.style.top = `${position.top}px`;
    container.style.left = `${position.left}px`;

    // Create popup content
    const popupEl = document.createElement("div");
    popupEl.className = `popup-container${isDarkMode() ? " dark" : ""}`;

    // Create emoji grid
    const grid = document.createElement("div");
    grid.className = "emoji-grid";

    // Single row with all emojis
    const emojiRow = document.createElement("div");
    emojiRow.className = "emoji-row";

    for (const emoji of emojis) {
      const btn = createEmojiButton(emoji, this.handleEmojiClick.bind(this));
      emojiRow.appendChild(btn);
    }

    grid.appendChild(emojiRow);

    popupEl.appendChild(grid);
    shadow.appendChild(popupEl);
    document.body.appendChild(container);

    // Set up close handlers
    this.setupCloseHandlers();
  }

  /**
   * Show loading state (not used for emoji matching - instant response)
   */
  showLoading(_position: PopupPosition): void {
    // Emoji matching is instant, so we don't need loading state
    // This method is kept for API compatibility but does nothing
  }

  /**
   * Hide the popup
   */
  hide(): void {
    // Clean up event listeners
    if (this.clickOutsideHandler) {
      document.removeEventListener("click", this.clickOutsideHandler);
      this.clickOutsideHandler = undefined;
    }
    if (this.escapeHandler) {
      document.removeEventListener("keydown", this.escapeHandler);
      this.escapeHandler = undefined;
    }

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
   * Handle emoji click
   */
  private handleEmojiClick(emoji: string): void {
    this.hide();

    if (this.onEmojiSelect) {
      this.onEmojiSelect(emoji);
    }
  }

  /**
   * Set up handlers to close popup
   */
  private setupCloseHandlers(): void {
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.hide();
      }
    };

    this.clickOutsideHandler = (e: MouseEvent) => {
      // Check if click is outside the popup using composedPath for Shadow DOM
      const path = e.composedPath();
      const isClickInsidePopup = path.some(node => node === this.container);

      if (!isClickInsidePopup && this.container) {
        this.hide();
      }
    };

    // Add handlers immediately
    document.addEventListener("keydown", this.escapeHandler);
    document.addEventListener("click", this.clickOutsideHandler);
  }
}
