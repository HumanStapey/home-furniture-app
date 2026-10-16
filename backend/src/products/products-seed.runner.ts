import { BeforeApplicationShutdown, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ProductsImportService } from './products-import.service';

@Injectable()
export class ProductsSeedRunner implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger(ProductsSeedRunner.name);
  private readonly cancellation = new AbortController();
  private retry?: ReturnType<typeof setTimeout>;
  private active?: Promise<void>;
  private stopped = false;

  constructor(private readonly importer: ProductsImportService) {}

  onApplicationBootstrap(): void {
    this.active = this.attempt();
  }

  private async attempt(): Promise<void> {
    try {
      const count = await this.importer.import(this.cancellation.signal);
      if (!this.stopped) this.logger.log(`Catalogue import completed: ${count} products received.`);
    } catch (error: unknown) {
      if (this.stopped) return;
      const message = error instanceof Error ? error.message : 'Catalogue import failed.';
      this.logger.warn(`${message} Retrying in 60 seconds.`);
      this.retry = setTimeout(() => { this.active = this.attempt(); }, 60_000);
      this.retry.unref();
    }
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.stopped = true;
    this.cancellation.abort();
    if (this.retry) clearTimeout(this.retry);
    await this.active;
  }
}
