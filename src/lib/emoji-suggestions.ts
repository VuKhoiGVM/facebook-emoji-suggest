import { KAOMOJI_SUGGESTIONS } from "./kaomoji";

/**
 * Emoji to emoji suggestions mappings
 * Keys are user input triggers, values are arrays of emoji characters
 */
export const EMOJI_SUGGESTIONS: Record<string, string[]> = {
  // Greetings
  hi: ["👋", "🤚", "✌", "👋🏻"],
  hello: ["👋", "🤚", "✌", "👋🏻"],
  hey: ["👋", "🤙", "yo"],
  yo: ["🤙", "sup", "yo"],

  // Farewells
  bye: ["👋", "✌", "👋🏻", "🙏"],
  cya: ["👋", "✌", "see ya", "later"],
  goodbye: ["👋", "✌", "farewell"],
  goodnight: ["😴", "🌙", "goodnight", "night"],

  // Positive Emotions
  love: ["❤️", "💕", "😍", "🥰", "💘"],
  lovely: ["❤️", "💕", "😍", "🥰"],
  thanks: ["🙏", "❤️", "😊", "thank you"],
  thx: ["🙏", "❤️", "ty"],
  ty: ["🙏", "❤️", "ty"],
  wow: ["😮", "🤩", "✨", "omg"],
  amazing: ["🤩", "✨", "amazing", "fire"],
  omg: ["😮", "😱", "shocked", "wow"],
  lol: ["😂", "🤣", "😆", "haha"],
  haha: ["😂", "🤣", "😆", "lol"],
  lmao: ["🤣", "😂", "dying", "dead"],
  rofl: ["🤣", "😂", "rotfl"],
  hehe: ["😄", "😊", "hehe"],
  yay: ["🎉", "🥳", "yay", "hooray"],
  nice: ["👍", "✨", "nice", "good"],
  great: ["👍", "🔥", "great", "awesome"],
  awesome: ["🔥", "👏", "awesome", "amazing"],
  cool: ["😎", "👍", "cool", "nice"],
  perfect: ["💯", "✨", "perfect", "100"],

  // Negative Emotions
  sad: ["😢", "😭", "😞", "sad", "cry"],
  crying: ["😭", "😢", "😿", "tear"],
  sorry: ["😔", "🙏", "sorry", "my bad"],
  no: ["👎", "❌", "nope", "no", "🙅‍♂️"],
  nope: ["👎", "❌", "nope", "nah"],
  angry: ["😠", "😡", "angry", "mad"],
  mad: ["😡", "😠", "mad", "furious"],
  upset: ["😞", "😔", "upset", "sad"],

  // Reactions
  yes: ["👍", "✅", "yes", "yeah"],
  yup: ["👍", "✅", "yep", "yea"],
  ok: ["👍", "✅", "ok", "okay"],
  okay: ["👍", "✅", "ok", "okay"],
  sure: ["👍", "✅", "sure", "alright"],

  // Expressions
  wtf: ["😲", "😮", "wtf", "what"],
  oops: ["😅", "whoops", "oops", "my bad"],
  rip: ["😢", "😇", "rip", "prayers"],
  brb: ["🏃", "💨", "brb", "later"],
  afk: ["⌨️", "💤", "afk", "away"],
  idk: ["🤷", "😐", "idk", "dunno"],
  tbh: ["🤷", "honestly", "tbf", "ngl"],
  btw: ["💡", "info", "btw", "fyi"],
  omw: ["🏃", "on my way", "omw"],
  nvm: ["🤷", "nevermind", "nvm", "forget it"],

  // Common Phrases
  please: ["🙏", "🥺", "pls", "please"],
  pls: ["🙏", "🥺", "pls", "please"],
  help: ["🆘", "🆘‍♀️", "help", "sos"],
  wait: ["⏳", "🤚", "wait", "hold on"],
  thinking: ["🤔", "hmm", "thinking", "think"],
  hmm: ["🤔", "hmm", "thinking"],
  shrug: ["🤷", "shrug", "idk", "whatever"],

  // Celebrations
  congrats: ["🎉", "🎊", "congrats", "celebrate"],
  congratz: ["🎉", "🎊", "congrats"],
  congratulations: ["🎉", "🎊", "congrats"],
  hbd: ["🎂", "🥳", "happy birthday"],
  birthday: ["🎂", "🥳", "happy birthday"],
  happy: ["😊", "😄", "happy", "smile"],
};

/**
 * Match user input against emoji and kaomoji database
 * Returns array of emoji/kaomoji suggestions
 */
export function matchEmoji(input: string): string[] | null {
  const normalized = input.toLowerCase().trim();

  // 1. Exact match - combine emoji and kaomoji results
  const emojiResults = EMOJI_SUGGESTIONS[normalized];
  const kaomojiResults = KAOMOJI_SUGGESTIONS[normalized];

  if (emojiResults || kaomojiResults) {
    const combined = [...(emojiResults || []), ...(kaomojiResults || [])];
    // Return up to 12 suggestions (emoji first, then kaomoji)
    return combined.slice(0, 12);
  }

  // 2. Partial match (min 2 chars)
  if (normalized.length >= 2) {
    // Check emoji suggestions
    const emojiMatches = Object.keys(EMOJI_SUGGESTIONS).filter((keyword) =>
      keyword.startsWith(normalized)
    );

    // Check kaomoji suggestions
    const kaomojiMatches = Object.keys(KAOMOJI_SUGGESTIONS).filter((keyword) =>
      keyword.startsWith(normalized)
    );

    // Combine all matches
    const allMatches = [...new Set([...emojiMatches, ...kaomojiMatches])];

    if (allMatches.length === 1) {
      const singleMatch = allMatches[0];
      const combined = [
        ...(EMOJI_SUGGESTIONS[singleMatch] || []),
        ...(KAOMOJI_SUGGESTIONS[singleMatch] || [])
      ];
      return combined.slice(0, 12);
    }

    // For multiple partial matches, combine and deduplicate
    if (allMatches.length > 1) {
      const combined = allMatches.flatMap((k) => [
        ...(EMOJI_SUGGESTIONS[k] || []),
        ...(KAOMOJI_SUGGESTIONS[k] || [])
      ]);
      // Deduplicate while preserving order
      return Array.from(new Set(combined)).slice(0, 12);
    }
  }

  return null;
}
