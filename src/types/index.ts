/**
 * Message types for communication between background and content scripts
 */
export type ExtensionMessage =
  | { type: "MATCH_KEYWORD"; word: string }
  | { type: "KEYWORD_MATCHED"; searchTerm: string }
  | { type: "NO_MATCH" };

/**
 * Response type for emoji matching
 */
export type EmojiMatchResponse =
  | { matched: true; emojis: string[] }
  | { matched: false };

/**
 * Response type for keyword matching (deprecated - use EmojiMatchResponse)
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
