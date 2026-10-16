import { Injectable } from '@nestjs/common';
import { parseProducts } from './fake-store-product.dto';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsImportService {
  constructor(private readonly repository: ProductsRepository) {}

  async import(cancellation?: AbortSignal): Promise<number> {
    const signal = AbortSignal.any([
      AbortSignal.timeout(10_000),
      ...(cancellation ? [cancellation] : []),
    ]);
    let response: Response;
    try {
      response = await fetch('https://fakestoreapi.com/products', { signal });
    } catch {
      throw new Error('Could not fetch products from Fake Store API (network, cancellation or timeout).');
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`Fake Store API returned HTTP ${response.status}.`);
    }
    let payload: unknown;
    try {
      // shortcut: keep this small catalogue in memory; stream and batch if the source grows substantially.
      payload = await response.json();
    } catch {
      throw new Error('Fake Store API response could not be read as JSON.');
    }
    const products = parseProducts(payload);
    signal.throwIfAborted();
    try {
      await this.repository.importBatch(products);
    } catch {
      throw new Error('Could not store imported products; the catalogue transaction was rolled back.');
    }
    return products.length;
  }
}
