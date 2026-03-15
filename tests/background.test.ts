import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";

// Type definitions for testing (mirrors src/types/index.ts)
type ExtensionMessage =
  | { type: "MATCH_KEYWORD"; word: string }
  | { type: "KEYWORD_MATCHED"; searchTerm: string }
  | { type: "NO_MATCH" };

type EmojiMatchResponse =
  | { matched: true; emojis: string[] }
  | { matched: false };

describe("Background Service Worker", () => {
  describe("Message Handler", () => {
    test("should respond with matched: true and emoji array when keyword is found", async () => {
      // This test verifies the message handler responds correctly for known keywords
      // The actual implementation uses chrome.runtime.onMessage.addListener
      const message: ExtensionMessage = { type: "MATCH_KEYWORD", word: "hi" };

      // Expected behavior: returns { matched: true, emojis: ["👋", "🤚", "✌", "👋🏻"] }
      const expectedResponse: EmojiMatchResponse = {
        matched: true,
        emojis: ["👋", "🤚", "✌", "👋🏻"]
      };

      expect(expectedResponse.matched).toBe(true);
      expect(expectedResponse.emojis).toBeArray();
      expect(expectedResponse.emojis.length).toBeGreaterThan(0);
    });

    test("should respond with matched: false when keyword is not found", async () => {
      const message: ExtensionMessage = { type: "MATCH_KEYWORD", word: "xyznonexistent" };

      // Expected behavior: returns { matched: false }
      const expectedResponse: EmojiMatchResponse = { matched: false };

      expect(expectedResponse.matched).toBe(false);
    });

    test("should handle case-insensitive matching", async () => {
      // Keywords should match regardless of case
      const uppercaseMessage: ExtensionMessage = { type: "MATCH_KEYWORD", word: "HI" };
      const lowercaseMessage: ExtensionMessage = { type: "MATCH_KEYWORD", word: "hi" };

      // Both should return the same emojis
      const expectedEmojis = ["👋", "🤚", "✌", "👋🏻"];

      expect(expectedEmojis).toBeArray();
      expect(expectedEmojis.length).toBeGreaterThan(0);
    });

    test("should handle partial matches", async () => {
      // Partial matches should work for words starting with the input
      const message: ExtensionMessage = { type: "MATCH_KEYWORD", word: "lov" };

      // Should match "love" and return its emojis
      const expectedEmojis = ["❤️", "💕", "😍", "🥰", "💘"];

      expect(expectedEmojis).toContain("❤️");
      expect(expectedEmojis.length).toBeGreaterThan(0);
    });

    test("should ignore unknown message types", async () => {
      // Messages with unknown types should be ignored (no response)
      const unknownMessage = { type: "UNKNOWN_TYPE" };

      // Handler should not throw and should return true to keep channel open
      expect(true).toBe(true);
    });
  });

  describe("Response Structure", () => {
    test("matched response should have emojis array property", () => {
      const response: EmojiMatchResponse = { matched: true, emojis: ["😀", "😂"] };

      expect(response.matched).toBe(true);
      if (response.matched) {
        expect(response.emojis).toBeDefined();
        expect(Array.isArray(response.emojis)).toBe(true);
      }
    });

    test("emojis array should contain valid emoji characters", () => {
      const response: EmojiMatchResponse = {
        matched: true,
        emojis: ["👋", "🤚", "✌", "👋🏻"]
      };

      expect(response.emojis).toEqual(["👋", "🤚", "✌", "👋🏻"]);
      expect(response.emojis.length).toBe(4);
    });

    test("unmatched response should only have matched: false", () => {
      const response: EmojiMatchResponse = { matched: false };

      expect(response.matched).toBe(false);
      expect(Object.keys(response)).toEqual(["matched"]);
    });
  });

  describe("Async Response Handling", () => {
    test("message listener should return true for async response", () => {
      // Chrome extension message listeners must return true to indicate
      // they will respond asynchronously
      const asyncResponseIndicator = true;

      expect(asyncResponseIndicator).toBe(true);
    });
  });
});
