import type { NextFunction } from "src/types/next-function";
import type { MessageCtx } from "src/types/telegraf-context";

/**
 * Verifies that the command doesn't have payload
 * @returns Method decorator
 */
export const CommandWithoutPayload = (): MethodDecorator => {
  return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Type assertion is expected here to describe any-typed
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const originalMethod = descriptor.value as (...args: unknown[]) => void | Promise<void>;
    /**
     * Updates the original method to introduce additional logic
     * @param args Arguments for original method
     */
    descriptor.value = async function (...args: [MessageCtx | undefined, NextFunction | undefined]) {
      const [ctx, next] = args;
      if (ctx && "payload" in ctx && ctx.payload) {
        await next?.();
        return;
      }
      await originalMethod.apply(this, args);
    };
  };
};
