# Recorrido del código para la entrevista

Guía basada en la lectura del código actual. Los enlaces abren el archivo en la línea donde empieza el bloque; el texto indica el rango que conviene explicar. No se ejecutaron pruebas durante esta revisión documental.

## 1. Apertura: arquitectura en 45 segundos

> “Es un monorepo con tres workspaces. El frontend es una aplicación React construida con Next.js, con navegación de cliente mediante React Router. Redux Toolkit maneja el carrito y RTK Query el acceso y caché de la API. El backend usa NestJS, TypeORM y PostgreSQL. Los contratos TypeScript compartidos definen qué información intercambian ambos. Fake Store alimenta la base local mediante una importación; las consultas normales leen PostgreSQL.”

Abre [package.json](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/package.json:22>) para mostrar los tres workspaces.

| Workspace | Responsabilidad | Archivo para empezar |
| --- | --- | --- |
| frontend | Navegación, vistas, estado de interfaz, carrito y consultas a la API | [App.tsx](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/App.tsx:35>) |
| backend | Validación HTTP, reglas de aplicación, consultas y persistencia | [products.controller.ts](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products.controller.ts:15>) |
| packages/contracts | Tipos públicos compartidos, independientes de React y NestJS | [index.ts](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/packages/contracts/src/index.ts:1>) |

Flujo de lectura del catálogo:

~~~text
Formulario / selector / paginación
    → parámetros de la URL (React Router)
    → readCatalogueQuery
    → useGetProductsQuery(query)
    → GET /api/products
    → ValidationPipe + ProductsQueryDto
    → ProductsController → ProductsService → ProductsRepository
    → PostgreSQL
    → ProductsResponse → caché RTK Query → render
~~~

Flujo de carga de datos:

~~~text
Arranque NestJS → ProductsSeedRunner → ProductsImportService
    → Fake Store → validación del lote → upsert transaccional → PostgreSQL
~~~

## 2. Contracts: empieza por el acuerdo entre front y back

Abre [packages/contracts/src/index.ts](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/packages/contracts/src/index.ts:1>). Es pequeño: puedes recorrerlo completo.

| Bloque | Líneas | Qué explicar |
| --- | --- | --- |
| Category | 1 | Es string; las categorías vienen de los datos importados. |
| Product | 3–14 | Modelo público, con precio numérico y rating anidado. |
| ProductsQuery | 16–23 | Búsqueda, categoría, página, tamaño, columna y dirección del orden. |
| ProductsResponse | 25–31 | Lista y metadatos de paginación. |
| ApiError | 33–37 | Forma común de los errores HTTP. |

> “Comparto el contrato HTTP para que front y back usen los mismos nombres y tipos. Mantengo la entidad de base de datos y los DTO con decoradores dentro del backend.”

Conecta el contrato con [builder.query<ProductsResponse, ProductsQuery>](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-api.ts:10>) y [ProductsQueryDto implements ProductsQuery](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products-query.dto.ts:10>).

Punto clave: las interfaces desaparecen al compilar. No validan JSON en ejecución. La validación HTTP está en class-validator y ValidationPipe; la importación tiene su propio parser. Los genéricos de RTK Query tampoco verifican por sí solos la estructura real de una respuesta.

## 3. Front: React Router

### Entrada y coexistencia con Next.js

Abre estos bloques en orden:

1. [page.tsx, líneas 3–8](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/app/[[...slug]]/page.tsx:3>): ruta opcional catch-all y generación de las rutas estáticas base.
2. [client.tsx, líneas 1–8](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/app/[[...slug]]/client.tsx:1>): frontera cliente; importa App con ssr: false.
3. [App.tsx, líneas 41–58](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/App.tsx:41>): Provider, BrowserRouter y tabla de rutas.

~~~tsx
<Routes>
  <Route path="/" element={<Navigate to="/products" replace />} />
  <Route path="/products" element={<CataloguePage />} />
  <Route path="/product/:id" element={<ProductDetailPage />} />
  <Route path="/cart" element={<CartPage />} />
  <Route path="*" element={<NotFoundPage />} />
</Routes>
~~~

> “Next.js aporta desarrollo y build estático. Una vez cargada App en el navegador, React Router resuelve las vistas. El catálogo se carga en el cliente; no se renderizan productos en el servidor.”

- BrowserRouter usa las URLs del navegador.
- Routes elige la ruta correspondiente; Route asocia el path con su vista.
- Navigate redirige /; replace evita conservar esa redirección como una entrada extra del historial.
- Link navega entre vistas; NavLink se usa para los enlaces de navegación con estado activo.
- La ruta comodín muestra la página de no encontrado.

En producción, [nginx.conf, líneas 27–29](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/nginx.conf:27>) sirve index.html como fallback para rutas como /product/123. [next.config.ts, líneas 3–9](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/next.config.ts:3>) configura exportación estática y el proxy /api durante desarrollo. [nginx.conf, líneas 15–20](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/nginx.conf:15>) hace ese proxy en el despliegue.

### Hooks de React Router

| Uso | Dónde abrir | Qué explicar |
| --- | --- | --- |
| useSearchParams | [catalogue-page.tsx:11](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-page.tsx:11>) | Lee y actualiza filtros, búsqueda, orden y página en la URL. |
| useParams | [product-detail-page.tsx:11](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/product-detail-page.tsx:11>) | Extrae :id, lo valida y usa skipToken para evitar pedir un ID inválido. |
| useLocation + state | [product-card.tsx:9](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/product-card.tsx:9>) | Pasa catalogueSearch al navegar al detalle. |
| Recuperación del origen | [product-detail-page.tsx:20](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/product-detail-page.tsx:20>) | Recupera la query del catálogo; el enlace de retorno está en la línea 45. |

Un detalle abierto directamente, sin estado de navegación, vuelve al catálogo sin filtros.

## 4. Front: Redux Toolkit y RTK Query

### Store e integración

Abre [store.ts, líneas 5–18](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/store.ts:5>).

~~~ts
export const store = configureStore({
  reducer: { [catalogueApi.reducerPath]: catalogueApi.reducer, cart: cartReducer },
  preloadedState: { cart: readCart() },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(catalogueApi.middleware),
});
~~~

> “El store combina el estado del carrito y el estado gestionado por RTK Query. Cargo el carrito guardado al crear el store. El middleware de RTK Query participa en el ciclo de las consultas.”

La suscripción de las líneas 11–18 guarda el carrito solo si cambia su referencia. Las actualizaciones de caché de productos no provocan por sí solas una escritura del carrito.

[hooks.ts, líneas 4–5](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/hooks.ts:4>) define dispatch y selector tipados. [App.tsx:41](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/App.tsx:41>) distribuye el store con Provider.

### API declarativa y caché

Abre [catalogue-api.ts, líneas 4–22](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-api.ts:4>).

- createApi declara tres consultas: listado, detalle y categorías.
- fetchBaseQuery usa /api/ y timeout de 10 segundos.
- Los genéricos describen respuesta y argumento de cada endpoint.
- Exporta useGetProductsQuery, useGetProductQuery y useGetCategoriesQuery.
- refetchOnReconnect vuelve a consultar al recuperar la conexión, con listeners configurados en App.
- refetchOnMountOrArgChange: 60 permite refrescar al suscribirse/cambiar argumentos si el resultado almacenado tiene suficiente antigüedad; no es un temporizador de polling.

En [catalogue-page.tsx, líneas 11–19](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-page.tsx:11>), cambiar la query hace que el hook consulte o utilice la entrada de caché correspondiente. La página consume currentData: datos de los argumentos actuales, para no mostrar una página o filtro anterior como si fuera el nuevo.

El estado de carga, error, reintento y lista vacía está en [catalogue-page.tsx, líneas 102–147](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-page.tsx:102>).

### Slice del carrito

Abre [cart.ts, líneas 49–78](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/cart/cart.ts:49>).

- addToCart agrega una línea o incrementa la existente por ID; al repetir un producto actualiza también su snapshot.
- setCartQuantity cambia una cantidad válida.
- removeFromCart elimina la línea.
- createSlice genera acciones y reducer. La sintaxis state.push o current.quantity += quantity utiliza Immer para producir las actualizaciones inmutables.

Muestra el dispatch real en [product-detail-page.tsx, líneas 92–98](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/product-detail-page.tsx:92>) y los selectores en [cart-page.tsx:36](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/cart/cart-page.tsx:36>) y [App.tsx:14](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/App.tsx:14>).

Las reglas están en [cart.ts, líneas 36–46](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/cart/cart.ts:36>): cantidades entre 1 y 100 y total seguro en centavos. [cart.ts, líneas 80–99](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/cart/cart.ts:80>) valida la restauración desde localStorage y tolera fallos de almacenamiento.

> “Separo cuatro clases de estado: URL para explorar el catálogo; RTK Query para datos remotos; slice para el carrito compartido; useState para inputs y mensajes temporales.”

El carrito es local al navegador. No hay checkout ni validación de stock, y cambiar cantidades no refresca precios desde el servidor.

## 5. Búsqueda, filtros, orden y paginación: el recorrido principal

### A. Convertir la URL a parámetros válidos

Abre [catalogue-query.ts, líneas 14–42](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-query.ts:14>).

readCatalogueQuery:
- Valida enteros positivos.
- Usa page=1 y limit=12 por defecto, con límite máximo de 100.
- Valida las combinaciones de orden ofrecidas por la interfaz.
- Recorta espacios de search y lo limita a 200 caracteres.
- Conserva la categoría.

catalogueParams hace el camino inverso y omite valores predeterminados para obtener una URL canónica. La UI ofrece id ascendente y precio/nombre en ambas direcciones; el backend también acepta id descendente.

### B. Eventos que cambian la consulta

Abre [catalogue-page.tsx, líneas 33–45](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-page.tsx:33>).

~~~ts
function change(values: Partial<CatalogueQuery>) {
  setParams(catalogueParams({ ...query, page: 1, ...values }));
}
~~~

El orden de los spreads es importante: conserva filtros, reinicia a página 1 y luego aplica el cambio. Si paginate pasa { page: 2 }, el último spread deja page=2.

- Búsqueda: search, líneas 37–40, previene la recarga del formulario, lee FormData, hace trim y llama change.
- Categoría: onChange, línea 86, actualiza category.
- Orden: líneas 91–98, separa sort/order y actualiza ambos.
- Página: paginate, líneas 43–45; botones en líneas 132–138.

> “Buscar ocurre al enviar el formulario. No hay búsqueda por cada pulsación ni debounce. Cambiar categoría u orden aplica inmediatamente y reinicia la página.”

No se usa Array.filter para buscar productos ni Array.slice para paginarlos en el navegador. El filter del carrito tiene otra finalidad.

### C. Petición HTTP y validación

[useGetProductsQuery(query)](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-page.tsx:14>) conecta con [getProducts](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-api.ts:10>), que envía los parámetros a GET /api/products.

Ejemplo de petición aceptada por la API, sin prometer resultados del catálogo real:

~~~http
GET /api/products?search=oak&category=lighting&page=2&limit=12&sort=price&order=asc
~~~

Abre [configure-app.ts, líneas 6–14](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/configure-app.ts:6>) y [products-query.dto.ts, líneas 6–45](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products-query.dto.ts:6>).

- La petición HTTP trae strings; decimalInteger convierte solo cadenas con dígitos.
- Los decoradores validan tipos, rangos, longitudes y valores permitidos.
- Se rechazan parámetros desconocidos.
- El front normaliza URLs para ofrecer una navegación utilizable; el backend valida porque cualquier cliente puede llamar directamente a la API.

### D. Consulta de base de datos: el bloque que más conviene dominar

Abre [products.repository.ts, líneas 28–39](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products.repository.ts:28>).

~~~ts
if (query.category) builder.andWhere('product.category = :category', { category: query.category });
if (query.search) {
  builder.andWhere("strpos(lower(product.title || ' ' || product.description), lower(:search)) > 0", {
    search: query.search,
  });
}
const columns = { id: 'product.id', title: 'product.title', price: 'product.price' };
builder.orderBy(columns[query.sort], query.order === 'asc' ? 'ASC' : 'DESC');
if (query.sort !== 'id') builder.addOrderBy('product.id', 'ASC');
return builder.skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
~~~

Explica cada decisión:

1. Categoría por igualdad exacta.
2. Búsqueda por subcadena literal sobre título + espacio + descripción, sin distinguir mayúsculas.
3. Ambos filtros se combinan con AND.
4. % y _ son caracteres ordinarios: se usa strpos, no los comodines de LIKE.
5. Los valores se enlazan mediante parámetros; las columnas de orden salen de un mapa cerrado.
6. ID ascendente desempata precios o títulos iguales para un orden determinista.
7. skip calcula el offset; take limita las filas; getManyAndCount devuelve página y total filtrado antes de paginar.

Ejemplo: page=3, limit=12 → offset=24. Se omiten 24 resultados y se solicitan hasta 12.

Las categorías del selector se obtienen por DISTINCT y orden alfabético en [products.repository.ts, líneas 18–25](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products.repository.ts:18>); no se limitan a la página visible.

### E. Respuesta y render de paginación

Abre [products.service.ts, líneas 27–33](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products.service.ts:27>).

~~~ts
return {
  items: items.map(toProduct), total, page: query.page, limit: query.limit,
  totalPages: Math.ceil(total / query.limit),
};
~~~

Con total=25 y limit=12, totalPages=3. total no es items.length.

En [catalogue-page.tsx, líneas 132–145](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-page.tsx:132>):
- Anterior se deshabilita en la primera página.
- Siguiente se deshabilita en la última.
- Ambos se deshabilitan durante una consulta en curso.
- Una página fuera de rango muestra un mensaje y un botón para volver a la primera.
- Si no hay coincidencias, permite limpiar filtros.

No se corrige silenciosamente una página fuera de rango en el backend: devuelve items vacío y conserva el total. Si no hay coincidencias, totalPages=0. Si la tabla entera está vacía, el servicio devuelve 503.

Límite que conviene reconocer: es paginación por offset. Cambios concurrentes pueden desplazar elementos entre páginas, y offsets grandes/búsqueda por subcadena necesitan medición antes de escalar. La migración actual solo crea el índice de clave primaria, sin índices específicos de búsqueda.

## 6. Todos los useEffect y por qué existen

| Archivo y línea | Dependencias | Responsabilidad |
| --- | --- | --- |
| [App.tsx:25](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/App.tsx:25>) | [] | Enfocar el main de la vista de ruta no encontrada. |
| [App.tsx:36](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/App.tsx:36>) | [] | Registrar listeners de RTK Query. setupListeners devuelve la función que React usa como cleanup. |
| [catalogue-page.tsx:21](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-page.tsx:21>) | [] | Enfocar el contenido al montar el catálogo. |
| [catalogue-page.tsx:25](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-page.tsx:25>) | [params, canonical, setParams] | Reemplazar una URL no canónica sin añadir una entrada al historial. El if evita repetir la actualización cuando ya coincide. |
| [catalogue-page.tsx:29](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/catalogue-page.tsx:29>) | [query.search] | Actualizar el input no controlado al cambiar la búsqueda de la URL, incluido volver/avanzar en el navegador. |
| [product-detail-page.tsx:34](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/catalogue/product-detail-page.tsx:34>) | [id] | Reiniciar cantidad y mensaje; enfocar y subir al inicio al cambiar de producto. |
| [cart-page.tsx:19](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/cart/cart-page.tsx:19>) | [item.quantity] | Sincronizar el borrador del input con la cantidad confirmada en Redux. |
| [cart-page.tsx:39](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/src/features/cart/cart-page.tsx:39>) | [] | Enfocar el carrito y volver al inicio al montarlo. |

> “Los efectos sincronizan componentes con navegación, DOM y listeners. Las peticiones las gestiona RTK Query y la persistencia del carrito se hace mediante la suscripción al store.”

Para explicar React con precisión:
- [] corresponde al montaje y su limpieza; no significa “una vez durante toda la vida de la aplicación”. Un remontaje vuelve a ejecutarlo; en desarrollo Strict Mode puede repetir setup/cleanup.
- [id] vuelve a ejecutar el efecto si cambia el ID, aunque se mantenga la misma instancia del componente.
- El cleanup libera recursos registrados; los efectos de foco no necesitan desregistrar listeners.
- En el catálogo, defaultValue no actualiza por sí solo el valor visible después del montaje: por eso existe la sincronización mediante ref cuando cambia query.search.

## 7. Back: responsabilidades, errores y datos

### Composición e inyección de dependencias

[main.ts, líneas 6–10](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/main.ts:6>) crea la app, activa hooks de cierre, configura la API y escucha el puerto.

[app.module.ts, líneas 7–19](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/app.module.ts:7>) configura TypeORM e importa ProductsModule. [products.module.ts, líneas 8–10](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products.module.ts:8>) registra controller y providers. Los constructores reciben las dependencias mediante NestJS.

### Controller → service → repository

| Capa | Bloque | Responsabilidad |
| --- | --- | --- |
| Controller | [products.controller.ts:19](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products.controller.ts:19>) | Expone HTTP, recibe DTO y delega; lista, categorías y detalle. categories se declara antes de :id. |
| Service | [products.service.ts:27](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products.service.ts:27>) | Disponibilidad, producto inexistente, transformación al contrato y metadatos. |
| Repository | [products.repository.ts:28](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products.repository.ts:28>) | Construye SQL mediante TypeORM y accede a la base de datos. |

[toProduct, líneas 7–16](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products.service.ts:7>) convierte price de string decimal a number y reconstruye rating anidado desde columnas separadas. La entidad no se expone directamente.

### Errores

[products.service.ts, líneas 23–46](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products.service.ts:23>) distingue catálogo vacío, búsqueda vacía y producto ausente.

[http-exception.filter.ts, líneas 9–30](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/common/http-exception.filter.ts:9>) construye ApiError y devuelve un mensaje genérico para errores internos.

| Situación | Respuesta |
| --- | --- |
| Parámetros inválidos | 400 |
| ID válido sin producto, con catálogo disponible | 404 |
| No hay productos guardados todavía | 503 |
| Búsqueda sin coincidencias, con catálogo disponible | 200 con lista vacía |
| Fallo inesperado, por ejemplo conexión a DB perdida | 500 genérico |

La documentación Swagger se configura en [configure-app.ts:15](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/configure-app.ts:15>) y se publica en /api/docs.

### Importación y tolerancia a fallos de la fuente

Recorre:

1. [products-seed.runner.ts, líneas 14–35](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products-seed.runner.ts:14>): inicia sin esperar que termine la importación; reintenta después de 60 segundos si falla; cancela al apagar.
2. [products-import.service.ts, líneas 9–38](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products-import.service.ts:9>): fetch con timeout/cancelación, chequeo HTTP, lectura JSON, validación y persistencia.
3. [fake-store-product.dto.ts, líneas 53–79](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/fake-store-product.dto.ts:53>): exige lote no vacío, valida productos, rechaza IDs duplicados y precios con más de dos decimales, transforma a entidades.
4. [products.repository.ts, líneas 42–48](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/products.repository.ts:42>): upsert transaccional por ID, omite actualizaciones sin cambios.

> “La fuente externa se consulta durante la importación. La navegación del usuario lee la base local. Un fallo de la fuente permite conservar y seguir sirviendo el catálogo ya guardado.”

No hay sincronización periódica después de una importación exitosa. El upsert no elimina productos que desaparecen de la fuente.

### Entidad y esquema

[product.entity.ts, líneas 3–34](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/products/product.entity.ts:3>) define columnas y restricciones: ID externo como clave primaria, precio NUMERIC(12,2), rating separado y comprobaciones de rango.

[database.config.ts, líneas 25–37](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/database/database.config.ts:25>) registra entidad y migración, con synchronize: false y migrationsRun: false. El esquema se aplica explícitamente mediante migraciones.

[CreateProducts, líneas 6–26](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/src/database/migrations/1792110633249-CreateProducts.ts:6>) muestra el SQL versionado del esquema.

## 8. Pruebas que puedes abrir para demostrar los casos importantes

Estos enlaces muestran cobertura escrita; no acreditan una ejecución reciente.

| Qué quieres demostrar | Prueba |
| --- | --- |
| URL, cambio de filtro, reset de página, atrás y recarga | [catalogue.spec.ts:42](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/test/catalogue.spec.ts:42>) |
| Búsqueda sin resultados y limpieza de filtros | [catalogue.spec.ts:83](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/test/catalogue.spec.ts:83>) |
| Input de búsqueda al volver por el historial | [catalogue.spec.ts:129](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/test/catalogue.spec.ts:129>) |
| No mostrar resultados del filtro anterior | [catalogue.spec.ts:191](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/test/catalogue.spec.ts:191>) |
| SQL, orden, búsqueda literal, paginación y validación HTTP | [products-api.test.cjs:15](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/test/integration/products-api.test.cjs:15>) |
| Carrito: acumulación, cantidades, centavos y persistencia | [cart.test.cjs:15](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/frontend/test-unit/cart.test.cjs:15>) |
| Retry de importación y parada después de éxito | [products-seed-runner.test.cjs:8](<C:/Users/ruizm/Documents/fullstack home furniture app/home furniture app/backend/test/products-seed-runner.test.cjs:8>) |

Las pruebas de navegador interceptan la API con Playwright. Las pruebas de integración del backend ejercitan PostgreSQL. Son evidencias complementarias; no equivalen a una única prueba de navegador contra todo el despliegue real.

## 9. Orden de exposición en 12–15 minutos

1. **1 min:** package.json y contracts: tres workspaces y forma del intercambio.
2. **2 min:** client.tsx y App.tsx: Next.js, React Router y rutas.
3. **2 min:** store.ts, catalogue-api.ts y cart.ts: distribución del estado.
4. **4 min:** catalogue-page → catalogue-query → DTO → repository → service: seguir una búsqueda con filtros y paginación.
5. **2 min:** tabla de useEffect: URL/input, listeners con cleanup y cambio de ID.
6. **2 min:** importador, transacción, entidad y errores.
7. **1–2 min:** mostrar dos pruebas y explicar límites reales.

Para ensayar, responde señalando código:
- ¿Por qué cambiar la categoría vuelve a página 1 y pulsar Siguiente sí conserva la página pedida?
- ¿Qué evita que una respuesta del filtro anterior aparezca como resultado del filtro nuevo?
- ¿Dónde se calcula totalPages y qué diferencia hay entre total e items.length?
- ¿Qué ocurre si busco el carácter %?
- ¿Por qué un contrato TypeScript no sustituye a ValidationPipe?
- ¿Por qué el efecto de setupListeners tiene cleanup aunque no se vea un return escrito?
- ¿Cómo sigue funcionando el catálogo si Fake Store falla y ya existen datos?
- ¿Qué cambia entre “no hay coincidencias” y “no hay catálogo”?

La respuesta fuerte combina ubicación, flujo, decisión y límite. Evita atribuir al código SSR de productos, polling cada minuto, búsqueda por debounce, paginación en memoria o un checkout que no están implementados.

