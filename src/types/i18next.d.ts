import "i18next";

import { defaultNs } from "index";
import en from "languages/en.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNs;
    resources: typeof en;
  }
}
