import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Category, ProductsQuery, ProductsResponse } from '@home-furniture/contracts';

export const catalogueApi = createApi({
  reducerPath: 'catalogueApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/', timeout: 10_000 }),
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 60,
  endpoints: builder => ({
    getProducts: builder.query<ProductsResponse, ProductsQuery>({
      query: params => ({ url: 'products', params }),
    }),
    getCategories: builder.query<Category[], void>({
      query: () => 'products/categories',
    }),
  }),
});

export const { useGetProductsQuery, useGetCategoriesQuery } = catalogueApi;
