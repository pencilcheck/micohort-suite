import type { Prisma } from '@prisma/client';

export interface PaginationProps {
  page: number;
  pageSize: number;
  orderBy?: Prisma.Enumerable<Prisma.MicpaPersonOrderByWithRelationAndSearchRelevanceInput>
}

export interface ScrapeResponse {
  personId: string;
  profiles: { personId: string; profile_url: string; screenshot: string; }[];
}
