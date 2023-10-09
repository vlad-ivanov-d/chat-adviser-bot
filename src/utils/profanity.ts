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

export interface ProfaneWord {
  /**
   * Marks that text is a root of the word
   */
  isRoot?: boolean | null;
  /**
   * Profanity which can be a root of the word or a word itself
   */
  word: string;
}

export class Profanity {
  private readonly profaneWords: ProfaneWord[];
  /**
   * English similar chars which can be used to workaround filter. Chars must be defined in lower case.
   */
  private readonly similarCharsEn: Record<string, string[]> = {};
  /**
   * Russian similar chars which can be used to workaround filter. Chars must be defined in lower case.
   */
  private readonly similarCharsRu: Record<string, string[]> = {
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
    ы: ["bi"],
    ь: ["b"],
    э: ["e", "е"],
    ю: ["io"],
    я: ["ya"],
  };

  /**
   * Creates the class to work with profane words
   * @param profaneWords Profane words which should be filtered
   */
  public constructor(profaneWords: Array<ProfaneWord | string>) {
    this.profaneWords = profaneWords.map((w) => ({
      isRoot: typeof w === "string" ? undefined : w.isRoot,
      word: typeof w === "string" ? w : w.word,
    }));
  }

  /**
   * Filters and checks profanity in the text
   * @param text Text to filter
   * @returns Profanity filter result
   */
  public filter(text: string): ProfanityResult {
    let hasProfanity = false;
    const filteredText = this.splitText(text)
      .map((word) => {
        let hasWord = false;
        /**
         * Replaces profanity with * chars and sets corresponding flags
         * @returns Replaced string
         */
        const replacer = (): string => {
          hasProfanity = true;
          hasWord = true;
          return "*".repeat(word.length);
        };
        const cleanWord = this.cleanWord(word);
        for (const profaneWord of this.profaneWords) {
          const cleanProfaneWord = this.cleanWord(profaneWord.word);
          const regExpEn = this.getProfanityRegExp({ ...profaneWord, word: cleanProfaneWord }, this.similarCharsEn);
          const regExpRu = this.getProfanityRegExp({ ...profaneWord, word: cleanProfaneWord }, this.similarCharsRu);
          const filteredWord = cleanWord.replace(regExpEn, replacer).replace(regExpRu, replacer);
          if (hasWord) {
            return filteredWord;
          }
        }
        return word;
      })
      .join("");
    return { filteredText, hasProfanity };
  }

  /**
   * Removes duplicated chars and converting the word to lowercase
   * @param word Word to clean
   * @returns Clean word
   */
  private cleanWord(word: string): string {
    return this.removeDuplicateChars(word.toLowerCase());
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
   * Gets profanity regular expression
   * @param profaneWord Profane word object
   * @param similarChars Similar chars which can be used to workaround regular expression
   * @returns Profanity regular expression
   */
  private getProfanityRegExp(profaneWord: ProfaneWord, similarChars: Record<string, string[]>): RegExp {
    const profanityRegexStr = profaneWord.word
      .split("")
      .map((char) => {
        const chars = [this.escapeCharForRegExp(char)];
        if (similarChars[char]) {
          chars.push(...similarChars[char].map((c) => this.escapeCharForRegExp(c)));
        }
        return `(${chars.join("|")})`;
      })
      .join("");
    return new RegExp(profaneWord.isRoot ? profanityRegexStr : `^${profanityRegexStr}$`);
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
   * Splits text into words and punctuation
   * @param text Text to split
   * @returns An array of separate words and puncruation
   */
  private splitText(text: string): string[] {
    // Regular expression to separate text into words, punctuation and spaces.
    const wordsAndPunctuation = text.split(/([\s,.;!?]+)/);
    // Removing empty elements that could appear due to several separators in a row
    return wordsAndPunctuation.filter((item) => item !== "");
  }
}
