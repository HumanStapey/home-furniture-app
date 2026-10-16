import { configureStore } from '@reduxjs/toolkit';
import { catalogueApi } from './features/catalogue/catalogue-api';
import { cartReducer, readCart, writeCart } from './features/cart/cart';

export const store = configureStore({
  reducer: { [catalogueApi.reducerPath]: catalogueApi.reducer, cart: cartReducer },
  preloadedState: { cart: readCart() },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(catalogueApi.middleware),
});

let savedCart = store.getState().cart;
store.subscribe(() => {
  const cart = store.getState().cart;
  if (cart !== savedCart) {
    savedCart = cart;
    writeCart(cart);
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
