import "i18next";

import { defaultNS } from "index";
import en from "languages/en.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: typeof en;
  }
}
