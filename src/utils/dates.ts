import { LanguageCode } from "@prisma/client";
import ru from "date-fns/locale/ru";

/**
 * Gets date locale for date-fns library
 * @param languageCode Language code
 * @returns Locale for date-fns library
 */
export const getDateLocale = (languageCode: string): Locale | undefined => {
  switch (languageCode) {
    case LanguageCode.RU:
    case "ru":
      return ru;
    default:
      return undefined;
  }
};
