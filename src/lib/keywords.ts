/**
 * Keyword to sticker search term mappings
 * Keys are user input triggers, values are search terms for Facebook's sticker picker
 */
export const KEYWORDS: Record<string, string> = {
  // Greetings
  hi: "hello wave hi",
  hello: "hello wave hi",
  hey: "hello wave hey",
  yo: "yo hey whatsup",
  sup: "sup whatsup yo",

  // Farewells
  bye: "goodbye bye wave",
  cya: "goodbye see you cya",
  goodbye: "goodbye bye wave",
  goodnight: "good night sleep moon",
  gn: "good night sleep",

  // Positive Emotions
  love: "love heart romantic",
  lovely: "love heart romantic",
  thanks: "thank you grateful thanks",
  thx: "thank you thanks",
  ty: "thank you ty",
  wow: "wow amazing impressed",
  amazing: "wow amazing impressed",
  omg: "omg shocked surprised",
  lol: "laugh funny lol haha",
  haha: "laugh funny haha lol",
  lmao: "laugh funny lmao",
  rofl: "laugh funny rofl",
  hehe: "laugh funny hehe",
  yay: "yay happy celebrate",
  yayy: "yay happy celebrate",
  yayyy: "yay celebrate happy",
  nice: "nice cool great",
  great: "nice great cool",
  awesome: "awesome cool great",
  cool: "cool nice awesome",
  perfect: "perfect great amazing",

  // Negative Emotions
  sad: "sad crying upset",
  crying: "sad crying tears",
  sorry: "sorry apologize sad",
  no: "no nope reject",
  nope: "no nope reject",
  angry: "angry mad upset",
  mad: "angry mad upset",
  upset: "sad upset angry",
  cry: "sad crying tears",
  disappointed: "sad disappointed upset",
  angryface: "angry mad rage",

  // Reactions
  yes: "yes ok agree thumbs up",
  yup: "yes yup agree",
  ok: "ok okay yes",
  okay: "ok okay yes",
  sure: "sure yes ok",
  agree: "agree yes thumbs up",

  // Expressions
  wtf: "confused what wtf shocked",
  oops: "oops mistake sorry",
  rip: "rip sad goodbye",
  brb: "brb wait be right back",
  afk: "afk away brb",
  idk: "idk confused shrug",
  tbh: "tbh honest truth",
  btw: "btw by the way",
  omw: "omw on my way",
  nvm: "nvm never mind",

  // Common Phrases
  please: "please beg request",
  pls: "please pls beg",
  help: "help confused question",
  wait: "wait hold on patience",
  thinking: "thinking hmm consider",
  hmm: "thinking hmm consider",
  shrug: "shrug idk whatever",
  whatever: "whatever shrug",

  // Celebrations
  congrats: "congratulations congrats celebrate",
  congratz: "congratulations congrats",
  congratulations: "congratulations congrats celebrate",
  hbd: "happy birthday cake",
  birthday: "happy birthday cake",
  happy: "happy smile celebrate",
};

/**
 * Match user input against keyword database
 * Supports exact match and partial match (prefix-based)
 */
export function matchKeyword(input: string): string | null {
  const normalized = input.toLowerCase().trim();

  // 1. Exact match (fastest, highest priority)
  if (KEYWORDS[normalized]) {
    return KEYWORDS[normalized];
  }

  // 2. Partial match - find keywords that start with input
  // Only trigger if input is at least 2 characters to avoid noise
  if (normalized.length >= 2) {
    const partialMatches = Object.keys(KEYWORDS).filter((keyword) =>
      keyword.startsWith(normalized)
    );

    // If only one match, use it directly
    if (partialMatches.length === 1) {
      return KEYWORDS[partialMatches[0]];
    }

    // If multiple matches, combine search terms (deduplicated)
    if (partialMatches.length > 1) {
      const searchTerms = partialMatches
        .map((k) => KEYWORDS[k])
        .join(" ")
        .split(" ")
        .filter((word, index, self) => self.indexOf(word) === index)
        .slice(0, 5)
        .join(" ");
      return searchTerms || null;
    }
  }

  return null;
}
