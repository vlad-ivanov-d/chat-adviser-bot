import { LanguageCode } from "@prisma/client";
import enLocale from "date-fns/locale/en-US";
import ruLocale from "date-fns/locale/ru";

/**
 * Date format related to date-fns
 */
export const DATE_FORMAT = "P p zzz";

/**
 * Date locales related to date-fns
 */
export const DATE_LOCALES: Record<LanguageCode, Locale> = {
  en: enLocale,
  ru: ruLocale,
};

/**
 * Database maximum integer limit
 */
export const MAX_INT = 2147483647;

/**
 * Page size
 */
export const PAGE_SIZE = 5;
