import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Product, ProductsResponse } from '@home-furniture/contracts';

const chair: Product = {
  id: 1, title: 'Oak chair', price: 109.95, category: 'furniture', description: 'Solid wood',
  image: 'https://example.com/chair.png', rating: { rate: 3.9, count: 120 },
};
const lamp: Product = { ...chair, id: 2, title: 'Desk lamp', price: 9.9, category: 'lighting' };
const response = (items: Product[], page = 1, total = items.length): ProductsResponse => ({
  items, page, total, limit: 12, totalPages: Math.ceil(total / 12),
});

async function catalogue(page: Page) {
  await page.route('https://example.com/**', route => route.abort());
  await page.route('**/api/products**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/categories')) return route.fulfill({ json: ['furniture', 'lighting'] });
    if (url.searchParams.get('search') === 'missing') return route.fulfill({ json: response([]) });
    if (url.searchParams.get('category') === 'lighting') return route.fulfill({ json: response([lamp]) });
    if (url.searchParams.get('page') === '2') return route.fulfill({ json: response([lamp], 2, 13) });
    if (url.searchParams.get('sort') === 'price') return route.fulfill({ json: response([lamp, chair]) });
    return route.fulfill({ json: response([chair], 1, 13) });
  });
}

test('filters and paginates through the URL, then restores the previous view', async ({ page }) => {
  await catalogue(page);
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: 'Oak chair' })).toBeVisible();
  await expect(page.getByText('Imagen no disponible').first()).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('heading', { name: 'Desk lamp' })).toBeVisible();
  await page.getByLabel('Categoría').selectOption('lighting');
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page).toHaveURL(/category=lighting/);
  await page.goBack();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByLabel('Categoría')).toHaveValue('');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Desk lamp' })).toBeVisible();
  await page.getByLabel('Ordenar por').selectOption('price:asc');
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.getByRole('article').getByRole('heading').first()).toHaveText('Desk lamp');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(element => element.clientWidth));
});

test('preserves full imported category names when filtering and reloading', async ({ page }) => {
  const category = 'a'.repeat(201);
  await catalogue(page);
  await page.route('**/api/products/categories', route => route.fulfill({ json: [category] }));
  await page.route('**/api/products?**', route => {
    const selected = new URL(route.request().url()).searchParams.get('category');
    return route.fulfill({ json: response(selected === category ? [{ ...chair, category }] : []) });
  });
  await page.goto('/products');
  await page.getByLabel('Categoría').selectOption(category);
  await expect(page.getByLabel('Categoría')).toHaveValue(category);
  await expect(page.getByRole('heading', { name: 'Oak chair' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('category')).toBe(category);
  await page.reload();
  await expect(page.getByLabel('Categoría')).toHaveValue(category);
  await expect(page.getByRole('heading', { name: 'Oak chair' })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(element => element.clientWidth));
});

test('shows an empty search and resets filters', async ({ page }) => {
  await catalogue(page);
  await page.goto('/products');
  await page.getByLabel('Buscar productos').fill('missing');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page).toHaveURL(/search=missing/);
  await expect(page.getByRole('heading', { name: 'No encontramos productos' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.getByRole('heading', { name: 'Oak chair' })).toBeVisible();
  await expect(page.getByLabel('Buscar productos')).toHaveValue('');
});

test('keeps brand and action styling consistent between catalogue and details', async ({ page }) => {
  await catalogue(page);
  await page.route('**/api/products/1', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/products');
  const search = page.getByRole('button', { name: 'Buscar', exact: true });
  const styles = await search.evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, font: style.fontFamily, radius: style.borderRadius };
  });
  await expect(page.locator('.brand-mark')).toHaveCSS('background-color', styles.background);
  await expect(page.getByLabel('Buscar productos')).toHaveCSS('font-family', styles.font);
  await page.getByRole('link', { name: 'Ver detalle de Oak chair' }).click();
  const retry = page.getByRole('button', { name: 'Reintentar', exact: true });
  await expect(retry).toHaveCSS('background-color', styles.background);
  await expect(retry).toHaveCSS('font-family', styles.font);
  await expect(retry).toHaveCSS('border-radius', styles.radius);
});

test('shows a visible focus ring when tabbing to buttons and product links', async ({ page }) => {
  await catalogue(page);
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: 'Oak chair' })).toBeVisible();
  await page.getByLabel('Buscar productos').focus();
  await page.keyboard.press('Tab');
  const search = page.getByRole('button', { name: 'Buscar', exact: true });
  await expect(search).toBeFocused();
  await expect(search).toHaveCSS('outline-style', 'solid');
  await page.getByLabel('Ordenar por').focus();
  await page.keyboard.press('Tab');
  const product = page.getByRole('link', { name: 'Ver detalle de Oak chair' });
  await expect(product).toBeFocused();
  await expect(product).toHaveCSS('outline-style', 'solid');
});

test('keeps search focus and restores its value through browser history', async ({ page }) => {
  await catalogue(page);
  await page.goto('/products?search=chair');
  const search = page.getByLabel('Buscar productos');
  await search.fill('missing');
  await search.press('Enter');
  await expect(page.getByRole('heading', { name: 'No encontramos productos' })).toBeVisible();
  await expect(search).toBeFocused();
  await page.goBack();
  await expect(search).toHaveValue('chair');
  await page.goForward();
  await expect(search).toHaveValue('missing');
});

test('recovers a failed product image when a refresh changes its URL', async ({ page }) => {
  await catalogue(page);
  let product = chair;
  await page.route('**/api/products?**', route => route.fulfill({ json: response([product]) }));
  await page.route('https://example.com/recovered.svg', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
  }));
  await page.goto('/products');
  await expect(page.getByText('Imagen no disponible')).toBeVisible();
  product = { ...chair, title: 'Updated oak chair', image: 'https://example.com/recovered.svg' };
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('heading', { name: 'Updated oak chair' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Updated oak chair' })).toHaveJSProperty('naturalWidth', 1);
});

test('keeps loading distinct from empty and recovers from catalogue unavailability', async ({ page }) => {
  await catalogue(page);
  let release: () => void = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  let unavailable = true;
  await page.route('**/api/products?**', async route => {
    if (unavailable) {
      await pending;
      return route.fulfill({ status: 503, json: { statusCode: 503, message: 'Unavailable', error: 'Service Unavailable' } });
    }
    return route.fulfill({ json: response([chair]) });
  });
  await page.goto('/products');
  await expect(page.getByRole('status')).toContainText('Cargando productos');
  await expect(page.getByRole('heading', { name: 'No encontramos productos' })).not.toBeVisible();
  release();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('El catálogo no está disponible');
  unavailable = false;
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Oak chair' })).toBeVisible();
});

test('sanitizes invalid link parameters and keeps products available if categories fail', async ({ page }) => {
  await catalogue(page);
  await page.route('**/api/products/categories', route => route.fulfill({ status: 500, json: {} }));
  await page.goto('/products?page=-2&limit=1000&sort=invalid&order=DROP&unknown=true');
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('heading', { name: 'Oak chair' })).toBeVisible();
  await expect(page.getByText('No pudimos cargar las categorías.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar categorías' })).toBeVisible();
});

test('does not present previous results as the results of a new filter', async ({ page }) => {
  await catalogue(page);
  let release: () => void = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/products?**', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('category') === 'lighting') {
      await pending;
      return route.fulfill({ json: response([lamp]) });
    }
    return route.fulfill({ json: response([chair]) });
  });
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: 'Oak chair' })).toBeVisible();
  await page.getByLabel('Categoría').selectOption('lighting');
  await expect(page.getByRole('status')).toContainText('Cargando productos');
  await expect(page.getByRole('heading', { name: 'Oak chair' })).not.toBeVisible();
  release();
  await expect(page.getByRole('heading', { name: 'Desk lamp' })).toBeVisible();
});
