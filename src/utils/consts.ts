import { LanguageCode } from "@prisma/client";
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

/**
 * Database maximum integer limit
 */
export const MAX_INT = 2_147_483_647;

/**
 * Page size
 */
export const PAGE_SIZE = 5;
