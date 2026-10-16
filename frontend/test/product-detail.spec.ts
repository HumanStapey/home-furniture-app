import { expect, test } from '@playwright/test';
import type { Product } from '@home-furniture/contracts';

const product: Product = {
  id: 2, title: 'Desk lamp', price: 9.9, category: 'lighting',
  description: 'An adjustable lamp for reading at your desk.',
  image: 'https://example.com/lamp.svg', rating: { rate: 4.5, count: 12 },
};

test.beforeEach(async ({ page }) => {
  await page.route('https://example.com/**', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect x="90" y="40" width="60" height="160" fill="#173c88"/></svg>',
  }));
  await page.route('**/api/products/categories', route => route.fulfill({ json: ['lighting'] }));
  await page.route('**/api/products?**', route => route.fulfill({ json: {
    items: [{ ...product, description: 'Catalogue summary' }], page: 2, total: 13, limit: 12, totalPages: 2,
  } }));
  await page.route('**/api/products/2', route => route.fulfill({ json: product }));
});

test('opens a product by keyboard and returns to the filtered catalogue', async ({ page }) => {
  await page.goto('/products?category=lighting&page=2');
  const link = page.getByRole('link', { name: 'Ver detalle de Desk lamp' });
  await expect(link).toHaveAttribute('href', '/product/2');
  await link.focus();
  await link.press('Enter');
  await expect(page).toHaveURL(/\/product\/2$/);
  await expect(page.getByRole('heading', { level: 1, name: product.title })).toBeVisible();
  await expect(page.getByText(product.description)).toBeVisible();
  await expect(page.getByText('USD 9,90')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Valoración: 4,5 de 5, 12 opiniones' })).toBeVisible();
  await expect(page.getByRole('img', { name: product.title })).toHaveJSProperty('naturalWidth', 240);
  await expect(page.getByRole('main')).toBeFocused();
  await page.getByRole('link', { name: 'Volver al catálogo' }).click();
  await expect(page).toHaveURL(/\/products\?category=lighting&page=2$/);
  await expect(page.getByLabel('Categoría')).toHaveValue('lighting');
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: product.title })).toBeVisible();
});

test('supports direct navigation, reload, image failures and mobile layout', async ({ page }) => {
  await page.route('https://example.com/**', route => route.abort());
  await page.goto('/product/2');
  await expect(page.getByRole('heading', { level: 1, name: product.title })).toBeVisible();
  await expect(page.getByText('Imagen no disponible')).toBeVisible();
  await expect(page.getByText(product.description)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: product.title })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(element => element.clientWidth));
  await page.getByRole('link', { name: 'Volver al catálogo' }).click();
  await expect(page).toHaveURL(/\/products$/);
});

test('announces loading before showing the product', async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/products/2', async route => {
    await pending;
    return route.fulfill({ json: product });
  });
  await page.goto('/product/2');
  await expect(page.getByRole('status')).toContainText('Cargando producto');
  await expect(page.getByRole('heading', { name: 'Producto no encontrado' })).not.toBeVisible();
  release();
  await expect(page.getByRole('heading', { level: 1, name: product.title })).toBeVisible();
});

test('shows a missing product distinctly from a temporary failure', async ({ page }) => {
  await page.route('**/api/products/2', route => route.fulfill({
    status: 404, json: { statusCode: 404, message: 'Not found', error: 'Not Found' },
  }));
  await page.goto('/product/2');
  await expect(page.getByRole('heading', { level: 1, name: 'Producto no encontrado' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).not.toBeVisible();
  await page.getByRole('link', { name: 'Volver al catálogo' }).click();
  await expect(page).toHaveURL(/\/products$/);
});

for (const failure of [503, 500, 'network'] as const) {
  test(`recovers from a ${failure} failure without reloading`, async ({ page }) => {
    let failed = true;
    await page.route('**/api/products/2', route => {
      if (!failed) return route.fulfill({ json: product });
      return failure === 'network' ? route.abort() : route.fulfill({
        status: failure, json: { statusCode: failure, message: 'Unavailable', error: 'Error' },
      });
    });
    await page.goto('/product/2');
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Producto no encontrado' })).not.toBeVisible();
    failed = false;
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: product.title })).toBeVisible();
  });
}

test('rejects malformed and out-of-range IDs without requesting a product', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/products/')) requests.push(request.url());
  });
  for (const id of ['abc', '0', '-1', '1.5', '1e2', '2147483648', '1%2Fcategories']) {
    await page.goto(`/product/${id}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Producto no encontrado' })).toBeVisible();
  }
  expect(requests).toEqual([]);
});

test('removes cached product details when a refresh returns 404', async ({ page }) => {
  await page.goto('/product/2');
  await expect(page.getByRole('heading', { level: 1, name: product.title })).toBeVisible();
  await page.route('**/api/products/2', route => route.fulfill({ status: 404, json: {} }));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('heading', { level: 1, name: 'Producto no encontrado' })).toBeVisible();
  await expect(page.getByText(product.description)).not.toBeVisible();
});
