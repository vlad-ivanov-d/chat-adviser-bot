import { LanguageCode } from "@prisma/client";
import type { Locale } from "date-fns";
import en from "date-fns/locale/en-US";
import ru from "date-fns/locale/ru";

/**
 * Gets date locale for date-fns library
 * @param languageCode Language code
 * @returns Locale for date-fns library
 */
export const getDateLocale = (languageCode: string): Locale => {
  switch (languageCode) {
    case LanguageCode.RU:
    case "ru":
      return ru;
    default:
      return en;
  }
};
