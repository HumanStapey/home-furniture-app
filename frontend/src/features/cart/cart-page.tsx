import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Button, Link, List, ListItem, Paper, TextField, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { formatCents, money } from '../catalogue/product-format';
import { cartTotalCents, MAX_CART_QUANTITY, removeFromCart, setCartQuantity } from './cart';
import type { CartItem } from './types';

function QuantityField({ item }: { item: CartItem }) {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState(String(item.quantity));
  useEffect(() => setValue(String(item.quantity)), [item.quantity]);

  return <TextField type="number" label="Cantidad" value={value}
    onChange={event => setValue(event.target.value)}
    onBlur={() => {
      const quantity = /^\d+$/.test(value) ? Number(value) : NaN;
      dispatch(setCartQuantity({ id: item.product.id, quantity }));
      setValue(String(item.quantity));
    }}
    onKeyDown={event => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur(); }}
    slotProps={{ htmlInput: { min: 1, max: MAX_CART_QUANTITY, step: 1, inputMode: 'numeric',
      'aria-label': `Cantidad de ${item.product.title}` } }} />;
}

export function CartPage() {
  const items = useAppSelector(state => state.cart);
  const dispatch = useAppDispatch();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.focus();
    window.scrollTo(0, 0);
  }, []);

  return <main id="catalogue-main" ref={main} tabIndex={-1} className="shell cart-page">
    <Typography component="h1" variant="h1">Tu carrito</Typography>
    <Typography color="text.secondary" sx={{ mt: 2, mb: 4 }}>Cantidades de 1 a {MAX_CART_QUANTITY} por producto. Precios en USD.</Typography>
    {items.length === 0 ? <Box className="empty-state">
      <Typography component="h2" variant="h3">Tu carrito está vacío</Typography>
      <Typography>Explora los productos y añade los que te gusten.</Typography>
      <Button component={RouterLink} to="/products">Explorar catálogo</Button>
    </Box> : <>
      <List disablePadding aria-label="Productos en el carrito">
        {items.map(item => <ListItem key={item.product.id} disableGutters divider className="cart-item">
          <Box className="cart-product">
            <Typography component="h2" variant="h2">
              <Link component={RouterLink} to={`/product/${item.product.id}`}>{item.product.title}</Link>
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>{money.format(item.product.price)} por unidad</Typography>
          </Box>
          <QuantityField item={item} />
          <Box className="cart-subtotal">
            <Typography variant="body2" color="text.secondary">Subtotal</Typography>
            <Typography sx={{ fontWeight: 700 }}>{formatCents(Math.round(item.product.price * 100) * item.quantity)}</Typography>
          </Box>
          <Button variant="text" aria-label={`Eliminar ${item.product.title}`} onClick={() => {
            dispatch(removeFromCart(item.product.id));
            main.current?.focus();
          }}>Eliminar</Button>
        </ListItem>)}
      </List>
      <Paper elevation={0} className="cart-summary">
        <Typography component="h2" variant="h2">Total</Typography>
        <Typography variant="h3" component="p" aria-label="Total del carrito" aria-live="polite">
          {formatCents(cartTotalCents(items))}
        </Typography>
      </Paper>
      <Button component={RouterLink} to="/products" variant="outlined" sx={{ mt: 3 }}>Seguir explorando</Button>
    </>}
  </main>;
}
