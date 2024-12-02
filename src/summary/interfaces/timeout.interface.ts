export interface SummaryTimeout {
  /**
   * Shows if the admin has a timeout for summary requests
   */
  hasAdminTimeout: boolean;
  /**
   * Shows if the user has a timeout for summary requests
   */
  hasUserTimeout: boolean;
  /**
   * Minutes to wait for the next available summary
   */
  minutes: number;
}
