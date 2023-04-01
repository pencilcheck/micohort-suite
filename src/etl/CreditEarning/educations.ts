import type { Prisma, PrismaClient, MicpaPerson, MicpaLinkedinPerson } from '@prisma/client';
import dayjs from 'dayjs';
import isEmpty from 'lodash/isEmpty';
import type { PaginationProps } from '../types'

// *Period is assumed to be already converted to EST timezone offset
// orderDate is higher precendence over creditDate if both are present
// keywords already tokenized properly before passing in
export interface PersonsProps {
  keywords?: string[];
  source?: '3rd-party' | 'micpa' | 'both';
  creditDatePeriod?: [Date, Date];
}

function createParams(
  { keywords, source = 'both', creditDatePeriod }: PersonsProps,
) {
  if (
    (creditDatePeriod && creditDatePeriod[0] && creditDatePeriod[1]
      && (dayjs(creditDatePeriod[0]) || dayjs(creditDatePeriod[1]))
      && dayjs(creditDatePeriod[0]) > dayjs(creditDatePeriod[1]))
  ) {
    throw new Error(`invalid period value: ${JSON.stringify(creditDatePeriod)}`)
  }

  const sourceToggle = source === '3rd-party' ? { isThirdParty: true } : source === 'micpa' ? { isThirdParty: false } : {}

  // prisma mysql fulltext: https://www.prisma.io/docs/concepts/components/prisma-client/full-text-search#mysql
  const keywordQuery = !isEmpty(keywords) ? {
    externalSource: {
      search: keywords?.map(k => `"${k}"`).join(' ')
    }
  } : {};

  const creditDateQuery = !isEmpty(creditDatePeriod) ? {
    AND: [
      {
        creditAt: {
          gte: creditDatePeriod?.[0],
        }
      },
      {
        creditAt: {
          lte: creditDatePeriod?.[1],
        }
      }
    ]
  } : null;

  const dateRangeQuery = creditDateQuery ?? {};

  // if just persons, only 3s
  return !isEmpty({ ...dateRangeQuery, ...keywordQuery, ...sourceToggle }) ? {
    where: {
      educationUnits: {
        some: {
          ...dateRangeQuery,
          ...keywordQuery,
          ...sourceToggle,
        }
      }
    },
  } : {};
}

export function personsOfEducationUnits(
  prisma: PrismaClient,
  props: PersonsProps,
  pagination?: PaginationProps
) {
  const params = createParams(props) as Prisma.MicpaPersonFindManyArgs;
  const paginationProps = isEmpty(pagination) ? {} : {
    take: pagination.pageSize,
    skip: (pagination.page-1) * pagination.pageSize,
  }
  // removed "include" here to speed up query, and have include be part of another query to construct final data to return in router instead of here
  return prisma.micpaPerson.findMany({
    select: {
      id: true,
    },
    orderBy: pagination?.orderBy || {
      name: "desc",
    },
    ...paginationProps,
    ...params
  });
}

export function countOfPersonsOfEducationUnits(
  prisma: PrismaClient,
  props: PersonsProps,
) {
  const params = createParams(props) as Prisma.MicpaPersonCountArgs;

  return prisma.micpaPerson.count(params);
}
