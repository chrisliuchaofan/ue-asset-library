import { CardGridSkeleton } from '@/components/page-loading';

export default function AssetsLoading() {
  return <CardGridSkeleton count={8} columns={4} />;
}
