export type Category = string;

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: Category;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
}

export interface ProductsQuery {
  search?: string;
  category?: Category;
  page?: number;
  limit?: number;
  sort?: 'id' | 'title' | 'price';
  order?: 'asc' | 'desc';
}

export interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}
