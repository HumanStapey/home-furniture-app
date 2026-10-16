import { ClientOnly } from './client';

export function generateStaticParams() {
  return [{ slug: [] }, { slug: ['products'] }];
}

export default function Page() {
  return <ClientOnly />;
}
