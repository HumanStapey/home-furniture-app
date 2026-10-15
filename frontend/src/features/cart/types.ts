import type { Product } from '@home-furniture/contracts';

export interface CartItem {
  product: Product;
  quantity: number;
}
