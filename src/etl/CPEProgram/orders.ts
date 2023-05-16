import { PrismaClient, MicpaPerson, MicpaLinkedinPerson } from '@prisma/client';
import dayjs from 'dayjs';
//import { startOfFiscalYear } from '../functions'
import type { PaginationProps } from '../types'

// *Period is assumed to be already converted to EST timezone offset
// orderDate is higher precendence over creditDate if both are present
// keywords already tokenized properly before passing in
interface ProductProps {
  customerId: string;
  keywords?: string[],
  orderDatePeriod?: [string, string];
  creditDatePeriod?: [string, string];
}

// expecting about 30-40s to query
export async function personsOfOrders(
  prisma: PrismaClient,
  { customerId, keywords, orderDatePeriod, creditDatePeriod }: ProductProps,
  { page, pageSize }: PaginationProps
) {
  if (
    (orderDatePeriod && (dayjs(orderDatePeriod[0]) || dayjs(orderDatePeriod[1])) && dayjs(orderDatePeriod[0]) > dayjs(orderDatePeriod[1]))
    || (creditDatePeriod && (dayjs(creditDatePeriod[0]) || dayjs(creditDatePeriod[1])) && dayjs(creditDatePeriod[0]) > dayjs(creditDatePeriod[1]))
  ) {
    throw new Error(`invalid period value: ${JSON.stringify(orderDatePeriod)} ${JSON.stringify(creditDatePeriod)}`)
  }

  // prisma mysql fulltext: https://www.prisma.io/docs/concepts/components/prisma-client/full-text-search#mysql
  const keywordQuery = keywords ? {
    orderDetails: {
      some: {
        product: {
          OR: [
            {
              name: {
                search: keywords.map(k => `"${k}"`).join(' ')
              }
            },
            {
              webName: {
                search: keywords.map(k => `"${k}"`).join(' ')
              }
            },
            {
              code: {
                search: keywords.map(k => `"${k}"`).join(' ')
              }
            },
          ]
        }
      },
    },
  } : {};

  const orderDateQuery = orderDatePeriod ? {
    AND: [
      {
        orderDate: {
          gte: orderDatePeriod[0],
        }
      },
      {
        orderDate: {
          lte: orderDatePeriod[1],
        }
      }
    ]
  } : null;

  const creditDateQuery = creditDatePeriod ? {
    AND: [
      {
        educationUnits: {
          some: {
            creditAt: {
              gte: creditDatePeriod[0],
            }
          }
        }
      },
      {
        educationUnits: {
          some: {
            creditAt: {
              lte: creditDatePeriod[1],
            }
          }
        }
      }
    ]
  } : null;

  const dateRangeQuery = orderDateQuery ?? creditDateQuery ?? {};

  // only care about education units as order details isn't that interesting to Eric and them
  return await prisma.micpaOrder.findMany({
    include: {
      educationUnits: { // adds 9s
        select: {
          isThirdParty: true,
          productId: true, // use this to group education category
          product: true, // adds 200ms
          educationCategory: true,
          creditEarned: true,
          creditAt: true,
        }
      },
    },
    where: {
      customerId: customerId,
      ...dateRangeQuery,
      ...keywordQuery,
    },
    orderBy: {
      orderDate: "desc",
    },
    take: pageSize,
    skip: (page-1) * pageSize,
  });
}
