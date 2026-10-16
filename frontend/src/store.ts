import { configureStore } from '@reduxjs/toolkit';
import { catalogueApi } from './features/catalogue/catalogue-api';

export const store = configureStore({
  reducer: { [catalogueApi.reducerPath]: catalogueApi.reducer },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(catalogueApi.middleware),
});
