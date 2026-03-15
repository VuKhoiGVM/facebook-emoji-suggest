import { describe, test, expect } from "bun:test";
import { matchEmoji, EMOJI_SUGGESTIONS } from "@/lib/emoji-suggestions";

describe("matchEmoji", () => {
  describe("exact match", () => {
    test("returns results including emojis for 'hi'", () => {
      const result = matchEmoji("hi");
      expect(result).not.toBeNull();
      // Should include the original emojis (may have kaomoji too)
      EMOJI_SUGGESTIONS["hi"].forEach(emoji => {
        expect(result).toContain(emoji);
      });
    });

    test("returns results including emojis for 'love'", () => {
      const result = matchEmoji("love");
      expect(result).not.toBeNull();
      EMOJI_SUGGESTIONS["love"].forEach(emoji => {
        expect(result).toContain(emoji);
      });
    });

    test("returns results including emojis for 'lol'", () => {
      const result = matchEmoji("lol");
      expect(result).not.toBeNull();
      EMOJI_SUGGESTIONS["lol"].forEach(emoji => {
        expect(result).toContain(emoji);
      });
    });

    test("returns results including emojis for 'bye'", () => {
      const result = matchEmoji("bye");
      expect(result).not.toBeNull();
      EMOJI_SUGGESTIONS["bye"].forEach(emoji => {
        expect(result).toContain(emoji);
      });
    });

    test("returns results including emojis for 'thanks'", () => {
      const result = matchEmoji("thanks");
      expect(result).not.toBeNull();
      EMOJI_SUGGESTIONS["thanks"].forEach(emoji => {
        expect(result).toContain(emoji);
      });
    });

    test("includes kaomoji for 'happy' keyword", () => {
      const result = matchEmoji("happy");
      expect(result).not.toBeNull();
      // Should have kaomoji like (◕‿◕)
      expect(result!.some(s => s.includes("◕‿◕"))).toBe(true);
    });
  });

  describe("case insensitive", () => {
    test("matches uppercase input", () => {
      const result = matchEmoji("HI");
      expect(result).not.toBeNull();
      // Should include the original emojis
      EMOJI_SUGGESTIONS["hi"].forEach(emoji => {
        expect(result).toContain(emoji);
      });
    });

    test("matches mixed case input", () => {
      const result = matchEmoji("LoVe");
      expect(result).not.toBeNull();
      EMOJI_SUGGESTIONS["love"].forEach(emoji => {
        expect(result).toContain(emoji);
      });
    });

    test("matches with trailing spaces", () => {
      const result = matchEmoji("  hi  ");
      expect(result).not.toBeNull();
      EMOJI_SUGGESTIONS["hi"].forEach(emoji => {
        expect(result).toContain(emoji);
      });
    });

    test("matches with leading spaces", () => {
      const result = matchEmoji("   hello");
      expect(result).not.toBeNull();
      EMOJI_SUGGESTIONS["hello"].forEach(emoji => {
        expect(result).toContain(emoji);
      });
    });
  });

  describe("partial match", () => {
    test("returns match for 'lov' (partial of 'love')", () => {
      const result = matchEmoji("lov");
      expect(result).not.toBeNull();
      // Should include emojis from love
      expect(result!).toContain(EMOJI_SUGGESTIONS["love"][0]);
    });

    test("returns combined results for multiple matches", () => {
      const result = matchEmoji("ha");
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      // Should include emojis/kaomoji from haha, happy, etc.
      expect(result!.length).toBeGreaterThan(0);
    });

    test("returns null for single character input", () => {
      expect(matchEmoji("h")).toBeNull();
    });

    test("returns null for single character after trim", () => {
      expect(matchEmoji("  h  ")).toBeNull();
    });

    test("returns exact match when only one partial match exists", () => {
      // Test that single partial match returns results
      const result = matchEmoji("goodni");
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result!.length).toBeGreaterThan(0);
    });

    test("combines and deduplicates results for multiple partial matches", () => {
      // 'th' should match 'thanks', 'thx', 'thinking'
      const result = matchEmoji("th");
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result!.length).toBeGreaterThan(0);
      // Should have at most 12 results (increased from 8 for kaomoji)
      expect(result!.length).toBeLessThanOrEqual(12);
    });
  });

  describe("no match", () => {
    test("returns null for unknown word", () => {
      expect(matchEmoji("xyzabc123")).toBeNull();
    });

    test("returns null for empty string", () => {
      expect(matchEmoji("")).toBeNull();
    });

    test("returns null for single space", () => {
      expect(matchEmoji(" ")).toBeNull();
    });

    test("returns null for whitespace only", () => {
      expect(matchEmoji("   ")).toBeNull();
    });

    test("returns null for numbers", () => {
      expect(matchEmoji("123")).toBeNull();
    });
  });

  describe("emoji database", () => {
    test("has at least 50 keywords", () => {
      const keywordCount = Object.keys(EMOJI_SUGGESTIONS).length;
      expect(keywordCount).toBeGreaterThanOrEqual(50);
    });

    test("all keywords map to non-empty arrays", () => {
      for (const [key, value] of Object.entries(EMOJI_SUGGESTIONS)) {
        expect(value).toBeTruthy();
        expect(Array.isArray(value)).toBe(true);
        expect(value.length).toBeGreaterThan(0);
      }
    });

    test("all emoji arrays contain at least one valid emoji character", () => {
      const regex = /\p{Emoji}/u;
      for (const [key, emojis] of Object.entries(EMOJI_SUGGESTIONS)) {
        // Each array should have at least one actual emoji
        const hasEmoji = emojis.some(emoji => regex.test(emoji));
        expect(hasEmoji).toBe(true);
      }
    });
  });

  describe("categories", () => {
    test("has greetings category keywords", () => {
      expect(EMOJI_SUGGESTIONS["hi"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["hello"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["hey"]).toBeDefined();
    });

    test("has farewells category keywords", () => {
      expect(EMOJI_SUGGESTIONS["bye"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["goodbye"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["cya"]).toBeDefined();
    });

    test("has positive emotions category keywords", () => {
      expect(EMOJI_SUGGESTIONS["love"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["happy"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["lol"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["haha"]).toBeDefined();
    });

    test("has negative emotions category keywords", () => {
      expect(EMOJI_SUGGESTIONS["sad"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["angry"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["sorry"]).toBeDefined();
    });

    test("has reactions category keywords", () => {
      expect(EMOJI_SUGGESTIONS["yes"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["no"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["ok"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["wow"]).toBeDefined();
    });

    test("has expressions category keywords", () => {
      expect(EMOJI_SUGGESTIONS["omg"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["wtf"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["oops"]).toBeDefined();
    });

    test("has celebrations category keywords", () => {
      expect(EMOJI_SUGGESTIONS["congrats"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["hbd"]).toBeDefined();
      expect(EMOJI_SUGGESTIONS["yay"]).toBeDefined();
    });
  });

  describe("kaomoji integration", () => {
    test("includes kaomoji for 'shrug' keyword", () => {
      const result = matchEmoji("shrug");
      expect(result).not.toBeNull();
      expect(result!.some(s => s.includes("ツ"))).toBe(true);
    });

    test("includes kaomoji for 'tableflip' keyword", () => {
      const result = matchEmoji("tableflip");
      expect(result).not.toBeNull();
      expect(result!.some(s => s.includes("┻"))).toBe(true);
    });

    test("includes kaomoji for 'sad' keyword", () => {
      const result = matchEmoji("sad");
      expect(result).not.toBeNull();
      // Should have kaomoji with sad faces
      expect(result!.some(s => s.includes("ω") || s.includes("╥"))).toBe(true);
    });

    test("returns combined results limited to 12 items", () => {
      const result = matchEmoji("ha");
      expect(result).not.toBeNull();
      // Should be limited to 12 items
      expect(result!.length).toBeLessThanOrEqual(12);
    });
  });
});
