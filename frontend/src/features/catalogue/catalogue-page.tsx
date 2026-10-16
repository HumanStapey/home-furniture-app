import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useGetCategoriesQuery, useGetProductsQuery } from './catalogue-api';
import { catalogueParams, readCatalogueQuery, sortOptions } from './catalogue-query';
import type { CatalogueQuery } from './catalogue-query';
import { ProductCard } from './product-card';

export function CataloguePage() {
  const [params, setParams] = useSearchParams();
  const query = readCatalogueQuery(params);
  const canonical = catalogueParams(query).toString();
  const products = useGetProductsQuery(query);
  const categories = useGetCategoriesQuery();
  const searchInput = useRef<HTMLInputElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const data = products.currentData;

  useEffect(() => {
    if (params.toString() !== canonical) setParams(canonical, { replace: true });
  }, [params, canonical, setParams]);

  useEffect(() => {
    if (searchInput.current) searchInput.current.value = query.search ?? '';
  }, [query.search]);

  function change(values: Partial<CatalogueQuery>) {
    setParams(catalogueParams({ ...query, page: 1, ...values }));
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('search');
    change({ search: typeof value === 'string' ? value.trim() || undefined : undefined });
  }

  function paginate(page: number) {
    change({ page });
    resultsHeading.current?.focus();
  }

  const unavailable = products.error && 'status' in products.error && products.error.status === 503;
  return (
    <main id="catalogue-main" className="shell catalogue">
      <section className="catalogue-intro" aria-labelledby="catalogue-title">
        <h1 id="catalogue-title">Explora el catálogo<span aria-hidden="true">.</span></h1>
        <p>Encuentra lo que buscas. Hazlo tuyo.</p>
      </section>

      <section className="catalogue-filters" aria-label="Buscar y filtrar productos">
        <form className="search-form" role="search" onSubmit={search}>
          <label htmlFor="search">Buscar productos</label>
          <div className="search-control">
            <input ref={searchInput} id="search" name="search" type="search" defaultValue={query.search ?? ''}
              maxLength={200} placeholder="¿Qué estás buscando?" />
            <button type="submit">Buscar</button>
          </div>
        </form>
        <div className="filter-field">
          <label htmlFor="category">Categoría</label>
          <select id="category" value={query.category ?? ''} disabled={!categories.currentData}
            onChange={event => change({ category: event.target.value || undefined })}>
            <option value="">Todas las categorías</option>
            {query.category && !categories.currentData?.includes(query.category) && <option value={query.category}>{query.category}</option>}
            {categories.currentData?.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="sort">Ordenar por</label>
          <select id="sort" value={`${query.sort}:${query.order}`} onChange={event => {
            const selected = readCatalogueQuery(new URLSearchParams({
              sort: event.target.value.split(':')[0], order: event.target.value.split(':')[1],
            }));
            change({ sort: selected.sort, order: selected.order });
          }}>
            {sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </section>

      {categories.isError && <div className="categories-notice">
        <span>No pudimos cargar las categorías.</span>
        <button className="text-button" type="button" disabled={categories.isFetching}
          onClick={() => void categories.refetch()}>Reintentar categorías</button>
      </div>}

      <section className="catalogue-results" aria-labelledby="results-title">
        <div className="results-summary">
          <h2 id="results-title" ref={resultsHeading} tabIndex={-1}>Productos</h2>
          <p role="status" aria-live="polite">
            {products.isFetching ? 'Cargando productos…' : data ? `${data.total} ${data.total === 1 ? 'producto' : 'productos'}` : ''}
          </p>
        </div>

        {products.isError && <div className="error-state" role="alert">
          <h3>{unavailable ? 'El catálogo no está disponible' : 'No pudimos cargar los productos'}</h3>
          <p>{data ? 'Se muestran los últimos resultados disponibles.' : 'Inténtalo de nuevo en unos minutos.'}</p>
          <button className="button" type="button" disabled={products.isFetching}
            onClick={() => void products.refetch()}>Reintentar</button>
        </div>}

        {!data && products.isFetching && <div className="product-grid" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <div className="product-skeleton" key={index}>
            <div /><span /><span /><span />
          </div>)}
        </div>}

        {data && data.items.length > 0 && <>
          <div className="product-grid" aria-busy={products.isFetching}>{data.items.map(product => <ProductCard key={product.id} product={product} />)}</div>
          <nav className="pagination" aria-label="Páginas de productos">
            <button type="button" className="button secondary" disabled={data.page <= 1 || products.isFetching}
              onClick={() => paginate(data.page - 1)}>Anterior</button>
            <span>Página {data.page} de {data.totalPages}</span>
            <button type="button" className="button secondary" disabled={data.page >= data.totalPages || products.isFetching}
              onClick={() => paginate(data.page + 1)}>Siguiente</button>
          </nav>
        </>}

        {data && data.items.length === 0 && !products.isError && <div className="empty-state">
          <h3>{data.total > 0 ? 'Esta página no tiene productos' : 'No encontramos productos'}</h3>
          <p>{data.total > 0 ? 'Vuelve a la primera página para ver los resultados.' : 'Prueba con otra búsqueda o cambia la categoría.'}</p>
          <button className="button secondary" type="button" onClick={() => data.total > 0 ? change({ page: 1 }) : setParams({})}>
            {data.total > 0 ? 'Ir a la primera página' : 'Limpiar filtros'}
          </button>
        </div>}
      </section>
    </main>
  );
}
