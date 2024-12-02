import type { PlanType } from "@prisma/client";

/**
 * Gets feature name with correspinding plan type
 * @param name Feature name
 * @param planType Plan type for this feature
 * @returns Feature name with correspinding plan type
 */
export const getFeatureName = (name: string, planType: PlanType): string => {
  return `${name} ${planType.toUpperCase()}`;
};
