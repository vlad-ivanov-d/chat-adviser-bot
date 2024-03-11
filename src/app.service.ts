import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, type OnApplicationBootstrap } from "@nestjs/common";
import { Cache as CacheManager } from "cache-manager";

@Injectable()
export class AppService implements OnApplicationBootstrap {
  /**
   * Creates service
   * @param cacheManager Cache manager
   */
  public constructor(@Inject(CACHE_MANAGER) private cacheManager: CacheManager) {}

  /**
   * Called once all modules have been initialized, but before listening for connections.
   */
  public async onApplicationBootstrap(): Promise<void> {
    // Clear storage before launch to prevent data mismatch errors when updating app version
    await this.cacheManager.reset();
  }
}
