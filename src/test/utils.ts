/**
 * Waits for the specified time
 * @param delay Delay in milliseconds
 */
export const sleep = async (delay: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, delay));
};
