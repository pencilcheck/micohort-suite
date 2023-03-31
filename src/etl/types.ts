import type { Prisma } from '@prisma/client';

export interface PaginationProps {
  page: number;
  pageSize: number;
  orderBy?: Prisma.Enumerable<Prisma.MicpaPersonOrderByWithRelationAndSearchRelevanceInput>
}
