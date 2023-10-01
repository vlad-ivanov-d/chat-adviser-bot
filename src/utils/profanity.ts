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
   * Creates the class to work with profane words
   * @param profaneWords Profane words which should be filtered
   */
  public constructor(profaneWords: Array<ProfaneWord | string>) {
    this.profaneWords = profaneWords.map((w) => ({
      isRoot: typeof w === "object" ? w.isRoot : undefined,
      word: this.removeDuplicateChars(typeof w === "string" ? w.toLowerCase() : w.word.toLowerCase()),
    }));
  }

  /**
   * Filters and checks profanity in the text
   * @param text Text to filter
   * @returns Profanity filter result
   */
  public filter(text: string): ProfanityResult {
    let hasProfanity = false;
    const filteredText = text
      .split(/\s+/)
      .map((word) => {
        const cleanedWord = this.cleanWord(word);
        if (this.isProfane(cleanedWord)) {
          hasProfanity = true;
          return this.replaceProfanity(cleanedWord);
        }
        return word;
      })
      .join(" ");
    return { filteredText, hasProfanity };
  }

  /**
   * Removes punctuation characters and converting the word to lowercase
   * @param word Word to clean
   * @returns Clean word
   */
  private cleanWord(word: string): string {
    return word.toLowerCase().replace(/[^\wа-яА-ЯёЁ]/gi, "");
  }

  /**
   * Checks if the word is profane
   * @param word Word to check
   * @returns True if the word is profane
   */
  private isProfane(word: string): boolean {
    const cleanWord = this.removeDuplicateChars(word);
    return this.profaneWords.some((w) => (w.isRoot ? cleanWord.includes(w.word) : w.word === word));
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
   * Replaces profane word with * characters
   * @param word Word to replace
   * @returns Word replaced with * characters
   */
  private replaceProfanity(word: string): string {
    return "*".repeat(word.length);
  }
}
