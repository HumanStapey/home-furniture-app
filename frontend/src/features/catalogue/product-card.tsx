import { useState } from 'react';
import type { Product } from '@home-furniture/contracts';

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD', currencyDisplay: 'code' });
const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

export function ProductCard({ product }: { product: Product }) {
  const [failedImage, setFailedImage] = useState<string>();
  return (
    <article className="product-card">
      <div className="product-image">
        {failedImage === product.image ? <span className="image-fallback">Imagen no disponible</span> : (
          <img src={product.image} alt={product.title} width={240} height={240}
            loading="lazy" decoding="async" onError={() => setFailedImage(product.image)} />
        )}
      </div>
      <p className="product-category">{product.category}</p>
      <h3 title={product.title}>{product.title}</h3>
      <div className="product-meta">
        <p className="product-price">{money.format(product.price)}</p>
        <span className="product-rating" aria-label={`Valoración: ${number.format(product.rating.rate)} de 5, ${product.rating.count} opiniones`}>
          <span aria-hidden="true">★ </span>{number.format(product.rating.rate)} <span>({product.rating.count})</span>
        </span>
      </div>
    </article>
  );
}
