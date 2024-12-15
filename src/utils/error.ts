/**
 * Tries to resolve error code from unknown error
 * @param error Unknown error
 * @returns Error code
 */
export const getErrorCode = (error: unknown): unknown => {
  // Try to get Telegram error code
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "error_code" in error.response &&
    typeof error.response.error_code === "number"
  ) {
    return error.response.error_code;
  }
  // Try to get usual error code
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (typeof error.code === "number" || typeof error.code === "string")
  ) {
    return error.code;
  }
  return undefined;
};
