import { expect, test } from '@playwright/test';
import type { Product } from '@home-furniture/contracts';

const product: Product = {
  id: 2, title: 'Desk lamp', price: 9.9, category: 'lighting', description: 'Adjustable desk lamp.',
  image: 'https://example.com/lamp.svg', rating: { rate: 4.5, count: 12 },
};

test.beforeEach(async ({ page }) => {
  await page.route('https://example.com/**', route => route.abort());
  await page.route('**/api/products**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith('/categories') ? ['lighting'] : path.endsWith('/2') ? product : {
      items: [product], page: 1, total: 13, limit: 12, totalPages: 2,
    } });
  });
});

for (const path of ['/products', '/product/2', '/cart', '/missing']) {
  test(`skip link moves keyboard focus into the main content on ${path}`, async ({ page }) => {
    await page.goto(path);
    const main = page.getByRole('main');
    await expect(main).toBeVisible();
    await expect(page.locator('head title')).toHaveCount(1);
    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await skip.focus();
    await expect(skip).toBeInViewport();
    await skip.press('Enter');
    await expect(main).toBeFocused();
  });
}

test('keyboard navigation announces each view and focuses the catalogue on return', async ({ page }) => {
  await page.goto('/products');
  await expect(page).toHaveTitle('Catálogo | Home Furniture');
  const productLink = page.getByRole('link', { name: 'Ver detalle de Desk lamp' });
  await productLink.focus();
  await productLink.press('Enter');
  await expect(page).toHaveTitle('Desk lamp | Home Furniture');
  await expect(page.getByRole('main')).toBeFocused();
  await page.keyboard.press('Tab');
  const back = page.getByRole('link', { name: 'Volver al catálogo' });
  await expect(back).toBeFocused();
  await back.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveTitle('Catálogo | Home Furniture');
  await page.getByRole('link', { name: 'Carrito (0)' }).click();
  await expect(page).toHaveTitle('Tu carrito | Home Furniture');
  await expect(page.getByRole('main')).toBeFocused();
  await page.goto('/missing');
  await expect(page).toHaveTitle('Página no encontrada | Home Furniture');
});

test('detail quantity errors explain the allowed range and announce the restored value', async ({ page }) => {
  await page.goto('/product/2');
  const quantity = page.getByRole('spinbutton', { name: 'Cantidad', exact: true });
  await quantity.fill('101');
  await expect(quantity).toHaveAttribute('aria-invalid', 'true');
  await expect(quantity).toHaveAccessibleDescription(/1.*100/);
  await quantity.press('Tab');
  await expect(quantity).toHaveValue('1');
  await expect(quantity).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Se restableció a 1');
  await page.setViewportSize({ width: 320, height: 720 });
  expect((await page.getByRole('main').getByRole('alert').boundingBox())!.width).toBeGreaterThan(200);
  await quantity.fill('2');
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  await expect(page.getByRole('status')).toContainText('2 unidades');
});

test('cart quantity errors explain why an edit was rejected without changing the total', async ({ page }) => {
  await page.addInitScript(product => localStorage.setItem('home-furniture:cart', JSON.stringify([
    { product, quantity: 2 },
  ])), product);
  await page.goto('/cart');
  const quantity = page.getByRole('spinbutton', { name: 'Cantidad de Desk lamp' });
  await quantity.fill('0');
  await expect(quantity).toHaveAttribute('aria-invalid', 'true');
  await expect(quantity).toHaveAccessibleDescription(/1.*100/);
  await quantity.press('Tab');
  await expect(quantity).toHaveValue('2');
  await expect(quantity).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Se mantuvo la cantidad anterior: 2');
  await page.setViewportSize({ width: 320, height: 720 });
  expect((await page.getByRole('main').getByRole('alert').boundingBox())!.width).toBeGreaterThan(200);
  await expect(page.getByLabel('Total del carrito')).toHaveText('USD 19,80');
  await quantity.fill('3');
  await quantity.press('Enter');
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('Total del carrito')).toHaveText('USD 29,70');
});

test('input boundaries and placeholder remain distinguishable against their backgrounds', async ({ page }) => {
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: product.title })).toBeVisible();
  await page.mouse.move(0, 0);
  const contrasts = await page.locator('.MuiOutlinedInput-root:not(.Mui-disabled)').evaluateAll(elements => {
    function rgb(color: string) { return color.match(/[\d.]+/g)!.map(Number); }
    function contrast(foreground: string, background: string) {
      const fg = rgb(foreground), bg = rgb(background);
      const alpha = fg[3] ?? 1;
      function luminance(channels: number[]) {
        return channels.slice(0, 3).map(channel => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      }
      const a = luminance(fg.slice(0, 3).map((value, index) => value * alpha + bg[index] * (1 - alpha)));
      const b = luminance(bg);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    }
    return elements.map(element => {
      const background = getComputedStyle(element).backgroundColor;
      const border = getComputedStyle(element.querySelector('fieldset')!).borderColor;
      const input = element.querySelector('input[placeholder]');
      const placeholder = input && getComputedStyle(input, '::placeholder');
      const placeholderColor = placeholder && rgb(placeholder.color);
      return {
        border: contrast(border, background),
        placeholder: placeholder && contrast(`rgba(${placeholderColor!.slice(0, 3).join(',')},${Number(placeholder.opacity) * (placeholderColor![3] ?? 1)})`, background),
      };
    });
  });
  for (const item of contrasts) {
    expect(item.border, 'Control boundary contrast').toBeGreaterThanOrEqual(3);
    if (item.placeholder !== null) expect(item.placeholder, 'Placeholder contrast').toBeGreaterThanOrEqual(4.5);
  }
});
