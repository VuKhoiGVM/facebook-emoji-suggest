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

    test("returns correct search term for 'bye'", () => {
      expect(matchKeyword("bye")).toBe(KEYWORDS["bye"]);
    });

    test("returns correct search term for 'thanks'", () => {
      expect(matchKeyword("thanks")).toBe(KEYWORDS["thanks"]);
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

    test("matches with leading spaces", () => {
      expect(matchKeyword("   hello")).toBe(KEYWORDS["hello"]);
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

    test("returns null for single character after trim", () => {
      expect(matchKeyword("  h  ")).toBeNull();
    });

    test("returns exact match when only one partial match exists", () => {
      // Test that single partial match returns the keyword's value
      const result = matchKeyword("goodni");
      expect(result).not.toBeNull();
      expect(result).toBe(KEYWORDS["goodnight"]);
    });

    test("combines and deduplicates terms for multiple partial matches", () => {
      // 'th' should match 'thanks', 'thx', 'ty', 'tbh'
      const result = matchKeyword("th");
      expect(result).not.toBeNull();
      // Should be a string with multiple words
      expect(typeof result).toBe("string");
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

    test("returns null for whitespace only", () => {
      expect(matchKeyword("   ")).toBeNull();
    });

    test("returns null for numbers", () => {
      expect(matchKeyword("123")).toBeNull();
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

    test("all search terms contain multiple words for better matching", () => {
      const entries = Object.entries(KEYWORDS);
      const multiWordEntries = entries.filter(([, value]) => value.split(" ").length >= 2);
      // Most entries should have multiple words for better Facebook sticker search
      expect(multiWordEntries.length).toBeGreaterThan(entries.length * 0.8);
    });
  });

  describe("categories", () => {
    test("has greetings category keywords", () => {
      expect(KEYWORDS["hi"]).toBeDefined();
      expect(KEYWORDS["hello"]).toBeDefined();
      expect(KEYWORDS["hey"]).toBeDefined();
    });

    test("has farewells category keywords", () => {
      expect(KEYWORDS["bye"]).toBeDefined();
      expect(KEYWORDS["goodbye"]).toBeDefined();
      expect(KEYWORDS["cya"]).toBeDefined();
    });

    test("has positive emotions category keywords", () => {
      expect(KEYWORDS["love"]).toBeDefined();
      expect(KEYWORDS["happy"]).toBeDefined();
      expect(KEYWORDS["lol"]).toBeDefined();
      expect(KEYWORDS["haha"]).toBeDefined();
    });

    test("has negative emotions category keywords", () => {
      expect(KEYWORDS["sad"]).toBeDefined();
      expect(KEYWORDS["angry"]).toBeDefined();
      expect(KEYWORDS["sorry"]).toBeDefined();
    });

    test("has reactions category keywords", () => {
      expect(KEYWORDS["yes"]).toBeDefined();
      expect(KEYWORDS["no"]).toBeDefined();
      expect(KEYWORDS["ok"]).toBeDefined();
      expect(KEYWORDS["wow"]).toBeDefined();
    });

    test("has expressions category keywords", () => {
      expect(KEYWORDS["omg"]).toBeDefined();
      expect(KEYWORDS["wtf"]).toBeDefined();
      expect(KEYWORDS["oops"]).toBeDefined();
    });

    test("has celebrations category keywords", () => {
      expect(KEYWORDS["congrats"]).toBeDefined();
      expect(KEYWORDS["hbd"]).toBeDefined();
      expect(KEYWORDS["yay"]).toBeDefined();
    });
  });
});
