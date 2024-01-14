export interface BasicModule {
  /**
   * Initiates basic module
   */
  init: () => void | Promise<void>;
  /**
   * Shutdowns basic module
   */
  shutdown?: () => void | Promise<void>;
}
