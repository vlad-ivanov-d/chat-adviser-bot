import { LanguageCode } from "@prisma/client";
import type { Locale } from "date-fns";
import en from "date-fns/locale/en-US";
import ru from "date-fns/locale/ru";

/**
 * Date format related to date-fns
 */
export const DATE_FORMAT = "P p zzz";

/**
 * Date locales related to date-fns
 */
export const DATE_LOCALES: Record<LanguageCode, Locale> = { [LanguageCode.EN]: en, [LanguageCode.RU]: ru };
