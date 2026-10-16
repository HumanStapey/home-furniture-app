import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';
import { BrowserRouter, Link as RouterLink, NavLink, Navigate, Route, Routes } from 'react-router';
import { Box, Button, CssBaseline, Link, StyledEngineProvider, ThemeProvider, Typography } from '@mui/material';
import { store } from './store';
import { theme } from './theme';
import { useAppSelector } from './hooks';
import { CartPage } from './features/cart/cart-page';
import { CataloguePage } from './features/catalogue/catalogue-page';
import { ProductDetailPage } from './features/catalogue/product-detail-page';

function CartLink() {
  const quantity = useAppSelector(state => state.cart.reduce((total, item) => total + item.quantity, 0));
  return <Link component={NavLink} className="cart-link" to="/cart" underline="none">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M5 7h14l1 14H4L5 7Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
    Carrito ({quantity})
  </Link>;
}

export default function App() {
  useEffect(() => setupListeners(store.dispatch), []);
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Provider store={store}>
          <BrowserRouter>
            <Link className="skip-link" href="#catalogue-main">Saltar al contenido</Link>
            <Box component="header" className="site-header">
              <div className="shell header-content">
                <Link component={RouterLink} className="brand" to="/products" aria-label="Home Furniture, inicio" underline="none">
                  <span className="brand-mark" aria-hidden="true">hf.</span><span className="brand-name">Home Furniture</span>
                </Link>
                <nav aria-label="Navegación principal"><Link component={NavLink} to="/products" underline="none">Catálogo</Link><CartLink /></nav>
              </div>
            </Box>
            <Routes>
              <Route path="/" element={<Navigate to="/products" replace />} />
              <Route path="/products" element={<CataloguePage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="*" element={
                <main id="catalogue-main" className="shell empty-state">
                  <Typography component="h1" variant="h3" sx={{ mb: 3 }}>Esta página no está disponible</Typography>
                  <Button component={RouterLink} to="/products">Volver al catálogo</Button>
                </main>
              } />
            </Routes>
            <Box component="footer" className="site-footer shell"><span>Home Furniture</span><span>Precios expresados en USD.</span></Box>
          </BrowserRouter>
        </Provider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
