import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Card, CardActionArea, Rating, Typography } from '@mui/material';
import type { Product } from '@home-furniture/contracts';
import { money, number } from './product-format';

export function ProductCard({ product }: { product: Product }) {
  const [failedImage, setFailedImage] = useState<string>();
  const { search } = useLocation();
  return (
    <Card component="article" className="product-card">
      <CardActionArea component={Link} className="product-card-link" to={`/product/${product.id}`} state={{ catalogueSearch: search }}
        aria-label={`Ver detalle de ${product.title}`}>
        <div className="product-image">
          {failedImage === product.image ? <Typography component="span" className="image-fallback">Imagen no disponible</Typography> : (
            <img src={product.image} alt={product.title} width={240} height={240}
              loading="lazy" decoding="async" onError={() => setFailedImage(product.image)} />
          )}
        </div>
        <Typography className="product-category">{product.category}</Typography>
        <Typography component="h3" variant="subtitle1" title={product.title}>{product.title}</Typography>
        <div className="product-meta">
          <Typography className="product-price">{money.format(product.price)}</Typography>
          <span className="product-rating">
            <Rating value={product.rating.rate} precision={0.1} readOnly size="small"
              aria-label={`Valoración: ${number.format(product.rating.rate)} de 5, ${product.rating.count} opiniones`} />
            <span aria-hidden="true">{number.format(product.rating.rate)} ({product.rating.count})</span>
          </span>
        </div>
      </CardActionArea>
    </Card>
  );
}
