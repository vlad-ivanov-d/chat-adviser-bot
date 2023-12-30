import "i18next";

import { DEFAULT_NS, LanguageResources } from "modules/language";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NS;
    resources: LanguageResources;
  }
}
