const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const {
  cartReducer, addToCart, setCartQuantity, removeFromCart, cartTotalCents,
  readCart, writeCart, CART_STORAGE_KEY,
} = require('../src/features/cart/cart.ts');
const { formatCents } = require('../src/features/catalogue/product-format.ts');

const product = {
  id: 1, title: 'Desk lamp', price: 0.1, category: 'lighting', description: 'Adjustable lamp',
  image: 'https://example.com/lamp.png', rating: { rate: 4.5, count: 12 },
};
afterEach(() => { delete globalThis.window; });

test('adding an existing product increments one line and refreshes its snapshot', () => {
  const first = cartReducer(undefined, addToCart(product));
  const next = cartReducer(first, addToCart({ ...product, title: 'Updated lamp', price: 0.2 }));
  assert.equal(first[0].quantity, 1);
  assert.equal(next.length, 1);
  assert.equal(next[0].quantity, 2);
  assert.equal(next[0].product.title, 'Updated lamp');
  assert.equal(cartTotalCents(next), 40);
});

test('quantity changes accept integers from 1 to 99 and leave invalid updates unchanged', () => {
  const initial = [{ product, quantity: 2 }];
  for (const quantity of [0, -1, 1.5, 100, NaN, Infinity, '3']) {
    assert.deepEqual(cartReducer(initial, setCartQuantity({ id: 1, quantity })), initial);
  }
  assert.equal(cartReducer(initial, setCartQuantity({ id: 1, quantity: 99 }))[0].quantity, 99);
  assert.deepEqual(cartReducer([{ product, quantity: 99 }], addToCart(product)), [{ product, quantity: 99 }]);
});

test('removal targets one product and unknown IDs leave the cart unchanged', () => {
  const initial = [{ product, quantity: 2 }, { product: { ...product, id: 2 }, quantity: 1 }];
  assert.deepEqual(cartReducer(initial, removeFromCart(1)), [initial[1]]);
  assert.deepEqual(cartReducer(initial, removeFromCart(999)), initial);
  assert.deepEqual(cartReducer(initial, setCartQuantity({ id: 999, quantity: 3 })), initial);
});

test('totals sum integer cents without floating-point quantity errors', () => {
  assert.equal(cartTotalCents([{ product, quantity: 3 }, { product: { ...product, id: 2, price: 0.2 }, quantity: 1 }]), 50);
  assert.equal(cartTotalCents([{ product: { ...product, price: 1.15 }, quantity: 3 }]), 345);
  assert.equal(cartTotalCents([{ product: { ...product, price: 19.99 }, quantity: 3 }]), 5997);
  assert.equal(cartTotalCents([]), 0);
});

test('currency formatting preserves exact cent digits across the safe integer range', () => {
  for (const [cents, expected] of [
    [0, 'USD 0,00'], [1, 'USD 0,01'], [30, 'USD 0,30'], [345, 'USD 3,45'],
    [9006999999990993, 'USD 90.069.999.999.909,93'],
    [Number.MAX_SAFE_INTEGER, 'USD 90.071.992.547.409,91'],
  ]) assert.equal(formatCents(cents).replace(/\s/g, ' '), expected);
});

test('updates cannot overflow the safe integer range for a cent total', () => {
  const initial = Array.from({ length: 91 }, (_, index) => ({
    product: { ...product, id: index + 1, price: 9_999_999_999.99 }, quantity: index === 90 ? 97 : 99,
  }));
  assert.equal(Number.isSafeInteger(cartTotalCents(initial)), true);
  assert.deepEqual(cartReducer(initial, addToCart(initial[90].product)), initial);
  assert.deepEqual(cartReducer(initial, setCartQuantity({ id: 91, quantity: 98 })), initial);
  assert.deepEqual(cartReducer(initial, addToCart({ ...initial[90].product, id: 92 })), initial);
});

test('persists and restores only the cart under its own storage key', () => {
  const values = new Map();
  globalThis.window = { localStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } };
  const items = [{ product, quantity: 3 }];
  writeCart(items);
  assert.equal(values.size, 1);
  assert.deepEqual(JSON.parse(values.get(CART_STORAGE_KEY)), items);
  assert.deepEqual(readCart(), items);
});

test('ignores malformed, duplicate and invalid persisted product or quantity data', () => {
  const item = { product, quantity: 1 };
  const invalid = [
    'not json', 'null', '{}', '[null]', JSON.stringify([item, item]),
    ...[0, -1, 1.5, 100, '2'].map(quantity => JSON.stringify([{ ...item, quantity }])),
    ...[
      { id: 0 }, { id: 2147483648 }, { title: '' }, { description: null }, { category: '' },
      { price: -1 }, { price: 0.001 }, { price: '2' }, { price: 10_000_000_000 },
      { image: 'javascript:alert(1)' }, { image: 'https://' },
      { rating: null }, { rating: { rate: 6, count: 1 } }, { rating: { rate: 4, count: -1 } },
    ].map(change => JSON.stringify([{ product: { ...product, ...change }, quantity: 1 }])),
  ];
  for (const value of invalid) {
    globalThis.window = { localStorage: { getItem: () => value } };
    assert.deepEqual(readCart(), [], value);
  }
});

test('unavailable or full browser storage does not prevent using the in-memory cart', () => {
  globalThis.window = { get localStorage() { throw new Error('Denied'); } };
  assert.deepEqual(readCart(), []);
  assert.doesNotThrow(() => writeCart([{ product, quantity: 1 }]));
  globalThis.window = { localStorage: {
    getItem: () => null,
    setItem: () => { throw new Error('Quota exceeded'); },
  } };
  assert.deepEqual(readCart(), []);
  assert.doesNotThrow(() => writeCart([{ product, quantity: 1 }]));
  assert.equal(cartReducer(undefined, addToCart(product))[0].quantity, 1);
});
