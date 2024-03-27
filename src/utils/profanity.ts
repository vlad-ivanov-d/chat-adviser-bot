import escapeRegExp from "lodash.escaperegexp";

export interface ProfanityResult {
  /**
   * Filtered text
   */
  filteredText: string;
  /**
   * Shows if text contains profanity
   */
  hasProfanity: boolean;
  /**
   * Original text
   */
  text: string;
}

export class Profanity {
  /**
   * Similar chars which can be used to workaround filter. Chars must be defined in lower case.
   */
  private readonly similarCharsMap = new Map<string, string[]>([
    // English
    ["a", ["@", "а"]],
    ["b", ["l3", "6", "в", "ь"]],
    ["c", ["с"]],
    ["e", ["е"]],
    ["i", ["1", "!"]],
    ["k", ["к", "i{", "|{"]],
    ["m", ["м"]],
    ["o", ["0", "о", "●"]],
    ["p", ["р"]],
    ["s", ["$", "z"]],
    ["t", ["+", "7", "т"]],
    ["x", ["х", "}{"]],
    ["y", ["у"]],
    // Russian
    ["а", ["a", "@"]],
    ["б", ["b", "6"]],
    ["в", ["b", "v"]],
    ["г", ["g", "r"]],
    ["д", ["d", "g"]],
    ["е", ["e", "ё", "йе", "йо"]],
    ["ж", ["zh", "*"]],
    ["з", ["z", "3"]],
    ["и", ["i", "u"]],
    ["й", ["i", "u", "y", "и"]],
    ["к", ["k", "i{", "|{"]],
    ["л", ["l", "ji"]],
    ["м", ["m"]],
    ["н", ["h", "n"]],
    ["о", ["o", "0", "●"]],
    ["п", ["п", "n", "p"]],
    ["р", ["p", "r"]],
    ["с", ["c", "s", "$"]],
    ["т", ["m", "t"]],
    ["у", ["u", "y"]],
    ["ф", ["f"]],
    ["х", ["h", "x", "}{"]],
    ["ц", ["c", "u,"]],
    ["ч", ["ch"]],
    ["ш", ["sh"]],
    ["щ", ["sch"]],
    ["ъ", ["b", "ь", "'", "`"]],
    ["ы", ["bi"]],
    ["ь", ["b", "ъ", "'", "`"]],
    ["э", ["e", "е"]],
    ["ю", ["io"]],
    ["я", ["ya"]],
  ]);

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
      const filterWordResult = this.filterWord(word);
      hasProfanity = hasProfanity || filterWordResult.hasProfanity;
      return filterWordResult.filteredText;
    };
    const firstPassText = this.splitText(text, "spaces+punctuation").map(mapFunction).join("");
    const secondPassText = this.splitText(firstPassText, "spaces+punctuation+capital").map(mapFunction).join("");
    const thirdPassText = this.splitText(secondPassText, "spaces").map(mapFunction).join("");
    return { filteredText: thirdPassText, hasProfanity, text };
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
      const profanityRegExp = this.getProfanityRegExp(cleanProfaneWord, this.similarCharsMap);
      let hasWord = false;
      const filteredText = cleanWord.replace(profanityRegExp, () => {
        hasProfanity = true;
        hasWord = true;
        return "*".repeat(word.length);
      });
      // Known issue with no-unnecessary-condition
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (hasWord) {
        return { filteredText, hasProfanity, text: word };
      }
    }
    return { filteredText: word, hasProfanity, text: word };
  }

  /**
   * Gets profanity regular expression
   * @param profaneWord Profane word. If a word begins or ends with the char *,
   * then instead of the char * there can be any sequence of letters.
   * @param similarCharsMap Similar chars which can be used to workaround regular expression
   * @returns Profanity regular expression
   */
  private getProfanityRegExp(profaneWord: string, similarCharsMap: Map<string, string[]>): RegExp {
    const regExpPattern = profaneWord
      .split("")
      .reduce<string[]>((result, char, i) => {
        if ((i === 0 || i === profaneWord.length - 1) && char === "*") {
          return result;
        }
        if (i === 0) {
          result.push("^");
        }
        const similarChars = [escapeRegExp(char), ...(similarCharsMap.get(char) ?? []).map(escapeRegExp)];
        result.push(`(${similarChars.join("|")})`);
        if (i === profaneWord.length - 1) {
          result.push("$");
        }
        return result;
      }, [])
      .join("");
    // Expected constructor for profanity RegExp
    // eslint-disable-next-line security/detect-non-literal-regexp
    return new RegExp(regExpPattern);
  }

  /**
   * Removes duplicate chars from the text
   * @param text Text
   * @returns Clean text without duplicate chars
   */
  private removeDuplicateChars(text: string): string {
    let result = "";
    for (const char of text) {
      if (result[result.length] !== char) {
        result += char;
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
  private splitText(text: string, variant: "spaces" | "spaces+punctuation" | "spaces+punctuation+capital"): string[] {
    switch (variant) {
      case "spaces":
        // Regular expression to separate text into words, punctuation and spaces.
        return text.split(/(\s+)/g).filter((p) => p);
      case "spaces+punctuation":
        // Regular expression to separate text into words, punctuation and spaces.
        return text.split(/([\s.,/<>?:;'"|\\{}[\]!@#$%^&*\-+=`~№]+)/g).filter((p) => p);
      case "spaces+punctuation+capital":
        // Regular expression to separate text into words, punctuation and spaces, including capital letters.
        return text.split(/([А-ЯЁA-Z][а-яёa-z]*|[\s.,/<>?:;'"|\\{}[\]!@#$%^&*\-+=`~№]+)/g).filter((p) => p);
      default:
        throw new Error("Unknown variant for splitting text in profanity filter.");
    }
  }
}
