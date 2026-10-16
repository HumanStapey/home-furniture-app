import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '@home-furniture/contracts';
import type { CartItem } from './types';

export const CART_STORAGE_KEY = 'home-furniture:cart';
export const MAX_CART_QUANTITY = 100;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_CART_QUANTITY;
}

function validProduct(value: unknown): value is Product {
  if (!record(value) || !record(value.rating)) return false;
  if (typeof value.id !== 'number' || !Number.isInteger(value.id) || value.id < 1 || value.id > 2147483647
    || typeof value.title !== 'string' || !value.title.trim()
    || typeof value.description !== 'string' || typeof value.category !== 'string' || !value.category.trim()
    || typeof value.price !== 'number' || !Number.isFinite(value.price) || value.price < 0
    || value.price > 9_999_999_999.99 || Number(value.price.toFixed(2)) !== value.price
    || typeof value.image !== 'string'
    || typeof value.rating.rate !== 'number' || !Number.isFinite(value.rating.rate)
    || value.rating.rate < 0 || value.rating.rate > 5
    || typeof value.rating.count !== 'number' || !Number.isInteger(value.rating.count)
    || value.rating.count < 0 || value.rating.count > 2147483647) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value.image).protocol);
  } catch {
    return false;
  }
}

export function cartTotalCents(items: readonly CartItem[]): number {
  return items.reduce((total, item) => total + Math.round(item.product.price * 100) * item.quantity, 0);
}

export function canAddToCart(items: readonly CartItem[], product: Product, quantity: number): boolean {
  if (!validProduct(product) || !validQuantity(quantity)) return false;
  const current = items.find(item => item.product.id === product.id);
  const nextQuantity = (current?.quantity ?? 0) + quantity;
  const total = cartTotalCents(items) - (current ? Math.round(current.product.price * 100) * current.quantity : 0)
    + Math.round(product.price * 100) * nextQuantity;
  return validQuantity(nextQuantity) && Number.isSafeInteger(total);
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: [] as CartItem[],
  reducers: {
    addToCart(state, { payload: { product, quantity } }: PayloadAction<CartItem>) {
      if (!canAddToCart(state, product, quantity)) return;
      const current = state.find(item => item.product.id === product.id);
      if (current) {
        current.product = product;
        current.quantity += quantity;
      } else {
        state.push({ product, quantity });
      }
    },
    setCartQuantity(state, { payload }: PayloadAction<{ id: number; quantity: number }>) {
      if (!validQuantity(payload.quantity)) return;
      const item = state.find(item => item.product.id === payload.id);
      if (!item) return;
      const total = cartTotalCents(state) + Math.round(item.product.price * 100) * (payload.quantity - item.quantity);
      if (Number.isSafeInteger(total)) item.quantity = payload.quantity;
    },
    removeFromCart(state, { payload: id }: PayloadAction<number>) {
      const index = state.findIndex(item => item.product.id === id);
      if (index !== -1) state.splice(index, 1);
    },
  },
});

export const { addToCart, setCartQuantity, removeFromCart } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;

export function readCart(): CartItem[] {
  try {
    const items: unknown = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(items) || !items.every((item): item is CartItem =>
      record(item) && validProduct(item.product) && validQuantity(item.quantity))) return [];
    if (new Set(items.map(item => item.product.id)).size !== items.length
      || !Number.isSafeInteger(cartTotalCents(items))) return [];
    return items;
  } catch {
    return [];
  }
}

export function writeCart(items: readonly CartItem[]): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Keep the cart usable in memory when browser storage is blocked or full.
  }
}
