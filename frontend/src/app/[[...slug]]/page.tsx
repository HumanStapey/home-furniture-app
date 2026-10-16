import { ClientOnly } from './client';

export function generateStaticParams() {
  return [{ slug: [] }, { slug: ['products'] }, { slug: ['cart'] }];
}

export default function Page() {
  return <ClientOnly />;
}
