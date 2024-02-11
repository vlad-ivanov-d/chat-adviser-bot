import "i18next";

import type { DEFAULT_NS } from "src/language/language.constants";
import type en from "src/language/translations/en.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NS;
    resources: typeof en;
  }
}
