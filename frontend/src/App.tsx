import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router';
import { store } from './store';
import { CataloguePage } from './features/catalogue/catalogue-page';

export default function App() {
  useEffect(() => setupListeners(store.dispatch), []);
  return (
    <Provider store={store}>
      <BrowserRouter>
        <a className="skip-link" href="#catalogue-main">Saltar al contenido</a>
        <header className="site-header">
          <div className="shell header-content">
            <Link className="brand" to="/products" aria-label="Home Furniture, inicio">
              <span className="brand-mark" aria-hidden="true">hf.</span>Home Furniture
            </Link>
            <nav aria-label="Navegación principal"><Link to="/products">Catálogo</Link></nav>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<CataloguePage />} />
          <Route path="*" element={
            <main id="catalogue-main" className="shell empty-state">
              <h1>Esta página no está disponible</h1><Link className="button" to="/products">Volver al catálogo</Link>
            </main>
          } />
        </Routes>
        <footer className="site-footer shell"><span>Home Furniture</span><span>Precios expresados en USD.</span></footer>
      </BrowserRouter>
    </Provider>
  );
}
