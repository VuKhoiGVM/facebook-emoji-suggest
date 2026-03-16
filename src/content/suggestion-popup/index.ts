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

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  padding: 0 4px 6px 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  margin-bottom: 4px;
}

.popup-container.dark .tabs {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.tab {
  padding: 6px 12px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: var(--tab-inactive-color, #65676b);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab:hover {
  background: var(--tab-hover-bg, rgba(0, 0, 0, 0.05));
}

.popup-container.dark .tab:hover {
  background: rgba(255, 255, 255, 0.1);
}

.tab.active {
  background: var(--tab-active-bg, rgba(0, 0, 0, 0.08));
  color: var(--tab-active-color, #1c1e21);
}

.popup-container.dark .tab.active {
  --tab-active-color: #e4e6eb;
  background: rgba(255, 255, 255, 0.1);
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

/* Sticker grid */
.sticker-grid {
  display: flex;
  gap: 0;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 400px;
  min-width: 200px;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}

.sticker-row {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  flex-shrink: 0;
}

.sticker-item {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  padding: 4px;
  transition: transform 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sticker-item img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.sticker-item:hover {
  transform: scale(1.1);
  background: var(--emoji-hover-bg, rgba(0, 0, 0, 0.05));
}

.sticker-loading, .sticker-error, .sticker-hint {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--loading-color, #65676b);
}

.sticker-error {
  color: #dc3545;
}

.sticker-hint {
  color: #1877f2;
  font-weight: 500;
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
  private onStickerSelect?: (stickerUrl: string) => void;
  private onStickerTabClick?: () => void;
  private clickOutsideHandler?: ((e: MouseEvent) => void);
  private escapeHandler?: ((e: KeyboardEvent) => void);
  private currentSearchTerm?: string;

  /**
   * Show the popup with emojis and optional sticker support
   */
  show(
    emojis: string[],
    position: PopupPosition,
    onEmojiSelect: (emoji: string) => void,
    onStickerSelect?: (stickerUrl: string) => void,
    searchTerm?: string,
    onStickerTabClick?: () => void
  ): void {
    this.hide();
    this.onEmojiSelect = onEmojiSelect;
    this.onStickerSelect = onStickerSelect;
    this.currentSearchTerm = searchTerm;
    this.onStickerTabClick = onStickerTabClick;

    const { container, shadow } = createPopupContainer();
    this.container = container;
    this.shadow = shadow;

    // Apply position to container
    container.style.top = `${position.top}px`;
    container.style.left = `${position.left}px`;

    // Create popup content
    const popupEl = document.createElement("div");
    popupEl.className = `popup-container${isDarkMode() ? " dark" : ""}`;

    // Create tabs
    const tabsContainer = document.createElement("div");
    tabsContainer.className = "tabs";

    const emojiTab = document.createElement("button");
    emojiTab.className = "tab active";
    emojiTab.textContent = "Emoji";
    emojiTab.dataset.tab = "emoji";

    const stickerTab = document.createElement("button");
    stickerTab.className = "tab";
    stickerTab.textContent = "Stickers";
    stickerTab.dataset.tab = "stickers";

    tabsContainer.appendChild(emojiTab);
    tabsContainer.appendChild(stickerTab);

    // Tab content
    const tabContent = document.createElement("div");

    // Emoji content
    const emojiContent = document.createElement("div");
    emojiContent.className = "tab-content active";
    emojiContent.id = "tab-emoji";

    const grid = document.createElement("div");
    grid.className = "emoji-grid";

    const emojiRow = document.createElement("div");
    emojiRow.className = "emoji-row";

    for (const emoji of emojis) {
      const btn = createEmojiButton(emoji, this.handleEmojiClick.bind(this));
      emojiRow.appendChild(btn);
    }

    grid.appendChild(emojiRow);
    emojiContent.appendChild(grid);

    // Sticker content (placeholder)
    const stickerContent = document.createElement("div");
    stickerContent.className = "tab-content";
    stickerContent.id = "tab-stickers";

    const stickerLoading = document.createElement("div");
    stickerLoading.className = "sticker-loading";
    stickerLoading.textContent = "Loading...";
    stickerContent.appendChild(stickerLoading);

    tabContent.appendChild(emojiContent);
    tabContent.appendChild(stickerContent);

    popupEl.appendChild(tabsContainer);
    popupEl.appendChild(tabContent);
    shadow.appendChild(popupEl);
    document.body.appendChild(container);

    // Tab switching
    const switchTab = (tabName: string) => {
      emojiTab.classList.toggle("active", tabName === "emoji");
      stickerTab.classList.toggle("active", tabName === "stickers");
      emojiContent.classList.toggle("active", tabName === "emoji");
      stickerContent.classList.toggle("active", tabName === "stickers");
    };

    emojiTab.addEventListener("click", () => switchTab("emoji"));
    stickerTab.addEventListener("click", () => {
      switchTab("stickers");
      // Only fetch stickers when user explicitly clicks the tab
      if (this.onStickerTabClick) {
        this.onStickerTabClick();
      }
    });

    // Set up close handlers
    this.setupCloseHandlers();
  }

  /**
   * Update stickers in the sticker tab
   */
  updateStickers(stickers: { imageUrl: string }[]): void {
    if (!this.shadow) return;

    const stickerContent = this.shadow.querySelector("#tab-stickers");
    if (!stickerContent) return;

    stickerContent.innerHTML = "";

    if (stickers.length === 0) {
      const empty = document.createElement("div");
      empty.className = "sticker-error";
      empty.textContent = "No stickers found";
      stickerContent.appendChild(empty);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "sticker-grid";

    const row = document.createElement("div");
    row.className = "sticker-row";

    for (const sticker of stickers) {
      const btn = document.createElement("button");
      btn.className = "sticker-item";

      const img = document.createElement("img");
      img.src = sticker.imageUrl;

      btn.appendChild(img);
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.onStickerSelect) {
          this.onStickerSelect(sticker.imageUrl);
        }
      });

      row.appendChild(btn);
    }

    grid.appendChild(row);
    stickerContent.appendChild(grid);
  }

  /**
   * Show error or hint in sticker tab
   */
  showStickerError(message: string): void {
    if (!this.shadow) return;

    const stickerContent = this.shadow.querySelector("#tab-stickers");
    if (!stickerContent) return;

    stickerContent.innerHTML = "";
    const el = document.createElement("div");
    // Use hint styling for instructional messages
    el.className = message.includes("📌") || message.includes("first") ? "sticker-hint" : "sticker-error";
    el.textContent = message;
    stickerContent.appendChild(el);
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
