/**
 * Waits a certain number of milliseconds
 * @param ms Number of milliseconds
 */
export const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};
