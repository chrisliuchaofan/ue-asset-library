import { CardGridSkeleton } from '@/components/page-loading';

export default function MaterialsLoading() {
  return <CardGridSkeleton count={8} columns={4} />;
}
