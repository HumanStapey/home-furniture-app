import type { ProductsQuery } from '@home-furniture/contracts';

export const sortOptions = [
  { value: 'id:asc', label: 'Orden predeterminado' },
  { value: 'price:asc', label: 'Precio: de menor a mayor' },
  { value: 'price:desc', label: 'Precio: de mayor a menor' },
  { value: 'title:asc', label: 'Nombre: A–Z' },
  { value: 'title:desc', label: 'Nombre: Z–A' },
] as const;

export type CatalogueQuery = Required<Pick<ProductsQuery, 'page' | 'limit' | 'sort' | 'order'>>
  & Pick<ProductsQuery, 'search' | 'category'>;

function integer(value: string | null, fallback: number, maximum: number): number {
  const parsed = value !== null && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : fallback;
}

export function readCatalogueQuery(params: URLSearchParams): CatalogueQuery {
  const sort = params.get('sort');
  const order = params.get('order') ?? 'asc';
  const validSort = sortOptions.some(option => option.value === `${sort ?? 'id'}:${order}`);
  const search = params.get('search')?.trim().slice(0, 200) || undefined;
  const category = params.get('category') || undefined;
  return {
    page: integer(params.get('page'), 1, 2147483647),
    limit: integer(params.get('limit'), 12, 100),
    sort: validSort && (sort === 'price' || sort === 'title') ? sort : 'id',
    order: validSort && order === 'desc' ? 'desc' : 'asc',
    search, category,
  };
}

export function catalogueParams(query: CatalogueQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.category) params.set('category', query.category);
  if (query.page !== 1) params.set('page', String(query.page));
  if (query.limit !== 12) params.set('limit', String(query.limit));
  if (query.sort !== 'id') params.set('sort', query.sort);
  if (query.order !== 'asc') params.set('order', query.order);
  return params;
}
