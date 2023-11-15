export interface ProfanityResult {
  /**
   * Filtered text
   */
  filteredText: string;
  /**
   * Shows if text contains profsnity
   */
  hasProfanity: boolean;
}

export class Profanity {
  /**
   * Similar chars which can be used to workaround filter. Chars must be defined in lower case.
   */
  private readonly similarChars: Record<string, string[]> = {
    // English
    i: ["1"],

    // Russian
    а: ["a", "@"],
    б: ["b", "6"],
    в: ["b", "v"],
    г: ["g", "r"],
    д: ["d", "g"],
    е: ["e", "ё", "йе", "йо"],
    ж: ["zh", "*"],
    з: ["z", "3"],
    и: ["i", "u"],
    й: ["i", "u", "y", "и"],
    к: ["k", "i{", "|{"],
    л: ["l", "ji"],
    м: ["m"],
    н: ["h", "n"],
    о: ["o", "0"],
    п: ["п", "n", "p"],
    р: ["p", "r"],
    с: ["c", "s", "$"],
    т: ["m", "t"],
    у: ["u", "y"],
    ф: ["f"],
    х: ["h", "x", "}{"],
    ц: ["c", "u,"],
    ч: ["ch"],
    ш: ["sh"],
    щ: ["sch"],
    ъ: ["b", "ь"],
    ы: ["bi"],
    ь: ["b", "ъ"],
    э: ["e", "е"],
    ю: ["io"],
    я: ["ya"],
  };

  /**
   * Creates the class to work with profane words
   * @param profaneWords Profane words which should be filtered. If a word begins or ends with the char *,
   * then instead of the char * there can be any sequence of letters.
   */
  public constructor(private readonly profaneWords: string[]) {}

  /**
   * Filters and checks profanity in the text
   * @param text Text to filter
   * @returns Profanity filter result
   */
  public filter(text: string): ProfanityResult {
    let hasProfanity = false;
    /**
     * Maps filter result
     * @param word Word to filter
     * @returns Filtered word
     */
    const mapFunction = (word: string): string => {
      const { filteredText: filteredWord, hasProfanity: hasProfanityWord } = this.filterWord(word);
      hasProfanity = hasProfanity || hasProfanityWord;
      return filteredWord;
    };
    const firstFilterText = this.splitText(text, "punctuation").map(mapFunction).join("");
    const secondFilterText = this.splitText(firstFilterText, "punctuation-capital-letters").map(mapFunction).join("");
    return { filteredText: secondFilterText, hasProfanity };
  }

  /**
   * Escapes char if it's necessary for correct regular expression
   * @param char Char which should be escaped if necessary
   * @returns Escaped char
   */
  private escapeCharForRegExp(char: string): string {
    const escapeChars: string[] = ["*", "$"];
    return char
      .split("")
      .map((c) => (escapeChars.includes(c) ? `\\${c}` : c))
      .join("");
  }

  /**
   * Filters and checks profanity in the word
   * @param word Word to filter
   * @returns Profanity filter result
   */
  private filterWord(word: string): ProfanityResult {
    let hasProfanity = false;
    const cleanWord = this.removeDuplicateChars(word.toLowerCase());
    for (const profaneWord of this.profaneWords) {
      const cleanProfaneWord = this.removeDuplicateChars(profaneWord.toLowerCase());
      const profanityRegExp = this.getProfanityRegExp(cleanProfaneWord, this.similarChars);
      let hasWord = false;
      const filteredText = cleanWord.replace(profanityRegExp, () => {
        hasProfanity = true;
        hasWord = true;
        return "*".repeat(word.length);
      });
      // Known issue with no-unnecessary-condition
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (hasWord) {
        return { filteredText, hasProfanity };
      }
    }
    return { filteredText: word, hasProfanity };
  }

  /**
   * Gets profanity regular expression
   * @param profaneWord Profane word. If a word begins or ends with the char *,
   * then instead of the char * there can be any sequence of letters.
   * @param similarChars Similar chars which can be used to workaround regular expression
   * @returns Profanity regular expression
   */
  private getProfanityRegExp(profaneWord: string, similarChars: Record<string, string[]>): RegExp {
    const profanityRegExpStr = profaneWord
      .split("")
      .map((char, i, arr) => {
        if (char === "*" && (i === 0 || i === arr.length - 1)) {
          return ""; // Remove starting and ending "*" character
        }
        const chars = [this.escapeCharForRegExp(char)];
        if (char in similarChars) {
          chars.push(...similarChars[char].map((c) => this.escapeCharForRegExp(c)));
        }
        return `(${chars.join("|")})`;
      })
      .join("");
    return new RegExp(
      `${profaneWord.startsWith("*") ? "" : "^"}${profanityRegExpStr}${profaneWord.endsWith("*") ? "" : "$"}`,
    );
  }

  /**
   * Removes duplicate chars from the text
   * @param text Text
   * @returns Clean text without duplicate chars
   */
  private removeDuplicateChars(text: string): string {
    if (!text) {
      return text;
    }
    let result = text[0];
    for (let i = 1; i < text.length; i++) {
      if (text[i] !== text[i - 1]) {
        result += text[i]; // Add a character to the result if it differs from the previous one
      }
    }
    return result;
  }

  /**
   * Splits text by different variants
   * @param text Text to split
   * @param variant Variant to split the text
   * @returns An array of separate words and punctuation
   */
  private splitText(text: string, variant: "punctuation" | "punctuation-capital-letters"): string[] {
    if (variant === "punctuation") {
      // Regular expression to separate text into words, punctuation and spaces.
      return text.split(/([\s.,/<>?:;'"|\\{}[\]!@#$%^&*\-+=`~№]+)/g).filter((p) => p);
    }
    // Regular expression to separate text into words, punctuation and spaces, including capital letters.
    return text.split(/([А-ЯЁA-Z][а-яёa-z]*|[\s.,/<>?:;'"|\\{}[\]!@#$%^&*\-+=`~№]+)/g).filter((p) => p);
  }
}
