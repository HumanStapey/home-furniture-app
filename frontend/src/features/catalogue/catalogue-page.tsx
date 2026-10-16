import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Alert, AlertTitle, Button, InputAdornment, Skeleton, TextField, Typography } from '@mui/material';
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
        <div className="catalogue-intro-copy">
          <Typography component="h1" variant="h1" id="catalogue-title">Haz espacio a lo que te gusta.</Typography>
          <Typography>Buenas ideas para tu día a día. Explora el catálogo y encuentra tu próxima elección.</Typography>
          <Button component="a" color="secondary" href="#catalogue-products">Explorar productos
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 12h15m-6-6 6 6-6 6" />
            </svg>
          </Button>
        </div>
        <figure className="catalogue-intro-image">
          <img src="/images/room-inspiration.webp" width={1200} height={800}
            alt="Rincón luminoso con un sillón azul, una mesa amarilla y plantas." fetchPriority="high" />
          <figcaption>Un rincón para inspirarte</figcaption>
        </figure>
      </section>

      <section id="catalogue-products" tabIndex={-1} className="catalogue-filters" aria-label="Buscar y filtrar productos">
        <form className="search-form" role="search" onSubmit={search}>
          <div className="search-control">
            <TextField inputRef={searchInput} id="search" name="search" type="search" defaultValue={query.search ?? ''}
              label="Buscar productos" placeholder="¿Qué estás buscando?"
              slotProps={{ htmlInput: { maxLength: 200 }, inputLabel: { shrink: true }, input: {
                startAdornment: <InputAdornment position="start">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />
                  </svg>
                </InputAdornment>,
              } }} />
            <Button type="submit">Buscar</Button>
          </div>
        </form>
        <TextField className="filter-field" select id="category" label="Categoría" value={query.category ?? ''}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} disabled={!categories.currentData}
          onChange={event => change({ category: event.target.value || undefined })}>
          <option value="">Todas las categorías</option>
          {query.category && !categories.currentData?.includes(query.category) && <option value={query.category}>{query.category}</option>}
          {categories.currentData?.map(category => <option key={category} value={category}>{category}</option>)}
        </TextField>
        <TextField className="filter-field" select id="sort" label="Ordenar por" value={`${query.sort}:${query.order}`}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} onChange={event => {
            const selected = readCatalogueQuery(new URLSearchParams({
              sort: event.target.value.split(':')[0], order: event.target.value.split(':')[1],
            }));
            change({ sort: selected.sort, order: selected.order });
          }}>
          {sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </TextField>
      </section>

      {categories.isError && <Alert severity="warning" className="categories-notice">
        <span>No pudimos cargar las categorías.</span>
        <Button variant="text" type="button" disabled={categories.isFetching}
          onClick={() => void categories.refetch()}>Reintentar categorías</Button>
      </Alert>}

      <section className="catalogue-results" aria-labelledby="results-title">
        <div className="results-summary">
          <Typography component="h2" variant="h2" id="results-title" ref={resultsHeading} tabIndex={-1}>Explora el catálogo</Typography>
          <Typography role="status" aria-live="polite">
            {products.isFetching ? 'Cargando productos…' : data ? `${data.total} ${data.total === 1 ? 'producto' : 'productos'}` : ''}
          </Typography>
        </div>

        {products.isError && <Alert severity="error" className="error-state">
          <AlertTitle component="h3">{unavailable ? 'El catálogo no está disponible' : 'No pudimos cargar los productos'}</AlertTitle>
          <Typography>{data ? 'Se muestran los últimos resultados disponibles.' : 'Inténtalo de nuevo en unos minutos.'}</Typography>
          <Button type="button" disabled={products.isFetching}
            onClick={() => void products.refetch()}>Reintentar</Button>
        </Alert>}

        {!data && products.isFetching && <div className="product-grid" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <div className="product-skeleton" key={index}>
            <div><Skeleton variant="rectangular" height="100%" /></div>
            <Skeleton sx={{ mt: 2, width: '90%' }} /><Skeleton width="90%" /><Skeleton width="45%" height={32} />
          </div>)}
        </div>}

        {data && data.items.length > 0 && <>
          <div className="product-grid" aria-busy={products.isFetching}>{data.items.map(product => <ProductCard key={product.id} product={product} />)}</div>
          <nav className="pagination" aria-label="Páginas de productos">
            <Button type="button" variant="outlined" disabled={data.page <= 1 || products.isFetching}
              onClick={() => paginate(data.page - 1)}>Anterior</Button>
            <span>Página {data.page} de {data.totalPages}</span>
            <Button type="button" variant="outlined" disabled={data.page >= data.totalPages || products.isFetching}
              onClick={() => paginate(data.page + 1)}>Siguiente</Button>
          </nav>
        </>}

        {data && data.items.length === 0 && !products.isError && <div className="empty-state">
          <Typography component="h3" variant="h3">{data.total > 0 ? 'Esta página no tiene productos' : 'No encontramos productos'}</Typography>
          <Typography>{data.total > 0 ? 'Vuelve a la primera página para ver los resultados.' : 'Prueba con otra búsqueda o cambia la categoría.'}</Typography>
          <Button variant="outlined" type="button" onClick={() => data.total > 0 ? change({ page: 1 }) : setParams({})}>
            {data.total > 0 ? 'Ir a la primera página' : 'Limpiar filtros'}
          </Button>
        </div>}
      </section>
    </main>
  );
}
