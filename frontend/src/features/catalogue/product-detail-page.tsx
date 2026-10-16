import { useEffect, useRef, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { Link as RouterLink, useLocation, useParams } from 'react-router';
import { Alert, AlertTitle, Box, Button, FormHelperText, Link, Rating, Skeleton, TextField, Typography } from '@mui/material';
import { useGetProductQuery } from './catalogue-api';
import { money, number } from './product-format';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { addToCart, canAddToCart, MAX_CART_QUANTITY } from '../cart/cart';

export function ProductDetailPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const productId = id && /^\d+$/.test(id) ? Number(id) : NaN;
  const validId = Number.isInteger(productId) && productId >= 1 && productId <= 2147483647;
  const detail = useGetProductQuery(validId ? productId : skipToken);
  const product = detail.currentData;
  const status = detail.error && 'status' in detail.error ? detail.error.status : undefined;
  const notFound = !validId || status === 404;
  const failed = !validId || detail.isError;
  const catalogueSearch = typeof state?.catalogueSearch === 'string' && state.catalogueSearch.startsWith('?')
    ? state.catalogueSearch : '';
  const [failedImage, setFailedImage] = useState<string>();
  const [addedProduct, setAddedProduct] = useState<number>();
  const [selectedQuantity, setSelectedQuantity] = useState('1');
  const [quantityMessage, setQuantityMessage] = useState('');
  const dispatch = useAppDispatch();
  const cart = useAppSelector(state => state.cart);
  const quantity = cart.find(item => item.product.id === productId)?.quantity ?? 0;
  const validQuantity = !!product && canAddToCart(cart, product, Number(selectedQuantity));
  const quantityHint = `Introduce una cantidad entera entre 1 y ${MAX_CART_QUANTITY - quantity} sin superar el total admitido del carrito.`;
  const quantityFeedback = quantityMessage || (!validQuantity && quantity < MAX_CART_QUANTITY ? quantityHint : '');
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    setSelectedQuantity('1');
    setQuantityMessage('');
    main.current?.focus();
    window.scrollTo(0, 0);
  }, [id]);

  return (
    <main id="catalogue-main" ref={main} tabIndex={-1} className="shell product-detail">
      <title>{`${notFound ? 'Producto no encontrado' : failed ? 'Producto no disponible'
        : product?.title ?? 'Detalle del producto'} | Home Furniture`}</title>
      <Link component={RouterLink} className="product-back" to={`/products${catalogueSearch}`}>Volver al catálogo</Link>

      {failed ? <Alert severity={notFound ? 'info' : 'error'} className="error-state" role={notFound ? 'status' : 'alert'}>
        <AlertTitle component="h1">{notFound ? 'Producto no encontrado' : status === 503
          ? 'El producto no está disponible temporalmente' : 'No pudimos cargar el producto'}</AlertTitle>
        <Typography>{notFound ? 'No encontramos un producto con este identificador. Vuelve al catálogo para seguir explorando.'
          : 'Inténtalo de nuevo en unos minutos.'}</Typography>
        {!notFound && <Button type="button" disabled={detail.isFetching}
          onClick={() => void detail.refetch()}>Reintentar</Button>}
      </Alert> : <>
        {detail.isFetching && <Typography className="product-loading" role="status">
          {product ? 'Actualizando producto…' : 'Cargando producto…'}
        </Typography>}
        {!product && detail.isFetching && <div className="product-detail-grid" aria-hidden="true">
          <div className="product-skeleton"><div><Skeleton variant="rectangular" height="100%" /></div></div>
          <div><Skeleton height={48} /><Skeleton sx={{ mt: 3 }} /><Skeleton width="45%" height={40} /></div>
        </div>}
        {product && <div className="product-detail-grid" aria-busy={detail.isFetching}>
          <div className="product-image">
            {failedImage === product.image ? <Typography component="span" className="image-fallback">Imagen no disponible</Typography> : (
              <img src={product.image} alt={product.title} width={500} height={500} decoding="async"
                onError={() => setFailedImage(product.image)} />
            )}
          </div>
          <section className="product-information" aria-labelledby="product-title">
            <Typography className="product-category">{product.category}</Typography>
            <Typography component="h1" variant="h1" id="product-title">{product.title}</Typography>
            <Typography className="product-price">{money.format(product.price)}</Typography>
            <Box className="product-rating">
              <Rating value={product.rating.rate} precision={0.1} readOnly size="small"
                aria-label={`Valoración: ${number.format(product.rating.rate)} de 5, ${product.rating.count} opiniones`} />
              <span aria-hidden="true">{number.format(product.rating.rate)} de 5 ({product.rating.count} opiniones)</span>
            </Box>
            <div className="product-purchase">
              <TextField type="number" id="product-quantity" label="Cantidad" value={selectedQuantity}
                disabled={detail.isFetching || quantity === MAX_CART_QUANTITY}
                error={!validQuantity && quantity < MAX_CART_QUANTITY}
                slotProps={{ htmlInput: { min: 1, max: MAX_CART_QUANTITY - quantity, step: 1, inputMode: 'numeric' },
                  input: { 'aria-describedby': quantityFeedback ? 'product-quantity-feedback' : undefined } }}
                onChange={event => { setSelectedQuantity(event.target.value); setQuantityMessage(''); }}
                onBlur={() => {
                  if (!validQuantity) {
                    setSelectedQuantity('1');
                    setQuantityMessage(`${quantityHint} Se restableció a 1.`);
                  }
                }}
                onKeyDown={event => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur(); }} />
              <Button type="button" disabled={detail.isFetching || !validQuantity}
                onClick={() => {
                  dispatch(addToCart({ product, quantity: Number(selectedQuantity) }));
                  setAddedProduct(product.id);
                  setSelectedQuantity('1');
                  setQuantityMessage('');
                }}>Añadir al carrito</Button>
              {quantityFeedback && <FormHelperText id="product-quantity-feedback" role="alert" className="quantity-feedback"
                error={!validQuantity && quantity < MAX_CART_QUANTITY}>{quantityFeedback}</FormHelperText>}
            </div>
            <Typography role="status" aria-live="polite" sx={{ mt: 1 }}>
              {addedProduct === product.id ? `Añadido al carrito. ${quantity} ${quantity === 1 ? 'unidad' : 'unidades'}.` : ''}
            </Typography>
            {quantity === MAX_CART_QUANTITY && <Typography color="text.secondary">Máximo {MAX_CART_QUANTITY} unidades por producto.</Typography>}
            <Typography component="h2" variant="h2">Descripción</Typography>
            <Typography className="product-description">{product.description}</Typography>
          </section>
        </div>}
      </>}
    </main>
  );
}
