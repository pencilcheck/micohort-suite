import { Box, Highlight, Text } from '@mantine/core';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import { useState } from 'react';
import type { MicpaEducationUnit } from '@prisma/client';

import { api } from "../../utils/api";

const PAGE_SIZE = 20;

type ColumnType = MicpaEducationUnit;

interface TableProps {
  id: string;
  keywords?: string[];
  creditDatePeriod?: [Date, Date];
}

export default function EducationUnitsTable({ id, creditDatePeriod, keywords }: TableProps) {
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'creditedAt', direction: 'desc' });

  // on render.com, longer timeout
  const result = api.cpeProgram.fetchPersonEducationDetails.useQuery({ id, creditDatePeriod });

  const handleSortStatusChange = (status: DataTableSortStatus) => {
    setPage(1);
    setSortStatus(status);
  };

  const EducationUnitsTable = DataTable<ColumnType>;

  return (<>
    <Box sx={{ height: 650 }}>
      <EducationUnitsTable
        withBorder
        borderRadius="sm"
        withColumnBorders
        striped
        verticalAlignment="top"
        fetching={result.isFetching}
        columns={[
          {
            accessor: 'id',
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'creditEarned',
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'educationCategory',
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'productId',
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'isThirdParty',
            ellipsis: true,
            sortable: true,
            render: ({ isThirdParty }) => <Text>{isThirdParty ? 'YES' : 'NO'}</Text>
          },
          {
            accessor: 'externalSource',
            ellipsis: true,
            sortable: true,
            render: ({ externalSource }) => <Highlight highlight={keywords || []}>{externalSource || ''}</Highlight>
          },
          {
            accessor: 'orderId',
            ellipsis: true,
            sortable: true,
          },
        ]}
        records={result.data?.rows as ColumnType[] ?? []}
        page={page}
        onPageChange={setPage}
        totalRecords={result.data?.total ?? 0}
        recordsPerPage={PAGE_SIZE}
        sortStatus={sortStatus}
        onSortStatusChange={handleSortStatusChange}
      />
    </Box>
  </>);
}
