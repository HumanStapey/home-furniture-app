import { expect, test } from '@playwright/test';
import type { Product } from '@home-furniture/contracts';

const lamp: Product = {
  id: 2, title: 'Desk lamp', price: 0.1, category: 'lighting', description: 'Adjustable lamp',
  image: 'https://example.com/lamp.png', rating: { rate: 4.5, count: 12 },
};

test.beforeEach(async ({ page }) => {
  await page.route('https://example.com/**', route => route.abort());
  await page.route('**/api/products/2', route => route.fulfill({ json: lamp }));
});

test('adds, changes quantity, persists across reloads and removes the last item', async ({ page }) => {
  await page.goto('/product/2');
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  await expect(page.getByRole('status')).toContainText('Añadido al carrito');
  await page.getByRole('link', { name: 'Carrito (1)' }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tu carrito' })).toBeVisible();
  await expect(page.getByRole('main')).toBeFocused();
  await page.getByLabel('Cantidad de Desk lamp').fill('3');
  await page.getByLabel('Cantidad de Desk lamp').press('Tab');
  await expect(page.getByRole('main').getByLabel('Total del carrito')).toHaveText('USD 0,30');
  await expect(page.getByRole('link', { name: 'Carrito (3)' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Cantidad de Desk lamp')).toHaveValue('3');
  await expect(page.getByLabel('Total del carrito')).toHaveText('USD 0,30');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(element => element.clientWidth));
  await page.getByRole('button', { name: 'Eliminar Desk lamp' }).click();
  await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeVisible();
});

test('merges repeated additions and rejects invalid quantity edits', async ({ page }) => {
  await page.goto('/product/2');
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  await page.getByRole('link', { name: 'Carrito (2)' }).click();
  const quantity = page.getByLabel('Cantidad de Desk lamp');
  await expect(quantity).toHaveValue('2');
  for (const invalid of ['0', '-1', '1.5', '101', '']) {
    await quantity.fill(invalid);
    await quantity.press('Tab');
    await expect(quantity).toHaveValue('2');
    await expect(page.getByLabel('Total del carrito')).toHaveText('USD 0,20');
  }
});

test('adds the quantity selected in the detail with one click and keeps it after reload', async ({ page }) => {
  await page.goto('/product/2');
  const quantity = page.getByRole('spinbutton', { name: 'Cantidad', exact: true });
  await quantity.fill('6');
  await quantity.press('ArrowUp');
  await expect(quantity).toHaveValue('7');
  await quantity.press('ArrowDown');
  await expect(quantity).toHaveValue('6');
  await quantity.press('ArrowUp');
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  await expect(page.getByRole('status')).toContainText('7 unidades');
  await page.getByRole('link', { name: 'Carrito (7)' }).click();
  await expect(page.getByLabel('Cantidad de Desk lamp')).toHaveValue('7');
  await expect(page.getByLabel('Total del carrito')).toHaveText('USD 0,70');
  await page.reload();
  await expect(page.getByLabel('Cantidad de Desk lamp')).toHaveValue('7');
});

test('adds 100 units at once and retains the per-product limit on reload and cart edits', async ({ page }) => {
  await page.goto('/product/2');
  const selected = page.getByRole('spinbutton', { name: 'Cantidad', exact: true });
  await selected.fill('100');
  await selected.press('ArrowUp');
  await expect(selected).toHaveValue('100');
  const add = page.getByRole('button', { name: 'Añadir al carrito' });
  await add.click();
  await expect(page.getByRole('link', { name: 'Carrito (100)' })).toBeVisible();
  await expect(add).toBeDisabled();
  await expect(page.getByLabel('Cantidad', { exact: true })).toBeDisabled();
  await page.reload();
  await expect(add).toBeDisabled();
  await page.getByRole('link', { name: 'Carrito (100)' }).click();
  const quantity = page.getByLabel('Cantidad de Desk lamp');
  await expect(quantity).toHaveValue('100');
  await expect(page.getByLabel('Total del carrito')).toHaveText('USD 10,00');
  await quantity.fill('101');
  await quantity.press('Tab');
  await expect(quantity).toHaveValue('100');
  await quantity.fill('1');
  await quantity.press('Tab');
  await quantity.fill('100');
  await quantity.press('Tab');
  await page.reload();
  await expect(quantity).toHaveValue('100');
});

test('limits the selector to the remaining capacity for a product already in the cart', async ({ page }) => {
  await page.addInitScript(product => localStorage.setItem('home-furniture:cart', JSON.stringify([{ product, quantity: 98 }])), lamp);
  await page.goto('/product/2');
  const quantity = page.getByLabel('Cantidad', { exact: true });
  await expect(quantity).toHaveAttribute('max', '2');
  await quantity.press('ArrowDown');
  await expect(quantity).toHaveValue('1');
  await quantity.press('ArrowUp');
  await quantity.press('ArrowUp');
  await expect(quantity).toHaveValue('2');
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  await expect(page.getByRole('link', { name: 'Carrito (100)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Añadir al carrito' })).toBeDisabled();
});

test('rejects invalid typed quantities in the detail and restores one on blur', async ({ page }) => {
  await page.goto('/product/2');
  const quantity = page.getByRole('spinbutton', { name: 'Cantidad', exact: true });
  for (const value of ['0', '-1', '1.5', '101', '']) {
    await quantity.fill(value);
    await expect(page.getByRole('button', { name: 'Añadir al carrito' })).toBeDisabled();
    await quantity.press('Tab');
    await expect(quantity).toHaveValue('1');
  }
  await expect(page.getByRole('link', { name: 'Carrito (0)' })).toBeVisible();
});

test('a malformed saved cart starts empty and remains usable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('home-furniture:cart', '{invalid'));
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeVisible();
  await page.goto('/product/2');
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  await page.getByRole('link', { name: 'Carrito (1)' }).click();
  await expect(page.getByLabel('Total del carrito')).toHaveText('USD 0,10');
});

test('blocked localStorage keeps the cart usable during this visit', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {
    get() { throw new DOMException('Storage blocked', 'SecurityError'); },
  }));
  await page.goto('/product/2');
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  await page.getByRole('link', { name: 'Carrito (1)' }).click();
  await expect(page.getByLabel('Total del carrito')).toHaveText('USD 0,10');
  await page.getByRole('button', { name: 'Eliminar Desk lamp' }).click();
  await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeVisible();
});

test('displays large accepted cent totals exactly and fits a 320px screen', async ({ page }) => {
  const items = Array.from({ length: 91 }, (_, index) => ({
    product: { ...lamp, id: index + 1, price: 9_999_999_999.99 }, quantity: index === 90 ? 97 : 99,
  }));
  await page.addInitScript(items => localStorage.setItem('home-furniture:cart', JSON.stringify(items)), items);
  await page.goto('/cart');
  await expect(page.getByLabel('Total del carrito')).toHaveText('USD 90.069.999.999.909,93');
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
});
