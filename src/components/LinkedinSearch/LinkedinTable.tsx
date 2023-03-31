import { Center, Box, Button, createStyles, Group, Stack, Text, useMantineTheme } from '@mantine/core';
import { closeAllModals, openModal } from '@mantine/modals';
import { useDebouncedValue } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useState } from 'react';
import { IconEdit, IconTrash, IconTrashX } from '@tabler/icons';
import { MicpaPerson, MicpaLinkedinPerson } from '@prisma/client';

import { api } from "../../utils/api";
import { JSONObject, JSONValue } from 'superjson/dist/types';
import LinkedinModal from './LinkedinModal';
import { ComponentValue, DocType } from '../../utils/puppeteer';
import CompareCell from './CompareCell';

const useStyles = createStyles((theme) => ({
  modal: { width: 800, height: "100%" },
  modalTitle: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
    fontWeight: 700,
  },
  modalLabel: { width: 80 },
}));

const PAGE_SIZE = 20;

interface Props {
  search?: string;
}

type ColumnType = MicpaLinkedinPerson & { micpaPerson: MicpaPerson };

export default function LinkedinTable({ search }: Props) {
  const { classes } = useStyles();
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'micpaPerson.name', direction: 'asc' });
  const [selectedRecords, setSelectedRecords] = useState<ColumnType[]>([]);

  const theme = useMantineTheme();

  const [debouncedQuery] = useDebouncedValue(search, 200);

  const persons = api.person.fetchLinkedinSearch.useQuery({ search: debouncedQuery, sortStatus: sortStatus, size: PAGE_SIZE, page });

  const {
    breakpoints: { xs: xsBreakpoint },
  } = useMantineTheme();
  const aboveXsMediaQuery = `(min-width: ${xsBreakpoint}px)`;

  const handleSortStatusChange = (status: DataTableSortStatus) => {
    setPage(1);
    setSortStatus(status);
  };

  const now = dayjs();
  
  const LinkedinTable = DataTable<ColumnType>;

  return (
    // place the data table in a height-restricted container to make it vertically-scrollable
    <Box sx={{ height: 650 }}>
      <LinkedinTable
        withBorder
        borderRadius="sm"
        withColumnBorders
        striped
        verticalAlignment="top"
        fetching={persons.isFetching}
        columns={[
          {
            accessor: 'micpaPerson.id',
            title: 'ID',
            width: 50,
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'micpaPerson.name',
            title: 'Name',
            width: 100,
            ellipsis: true,
            sortable: true,
          },
          // TODO add information parsed columns and show color for meaingful differences
          {
            accessor: 'information.email',
            title: 'Email',
            width: 200,
            sortable: false,
            visibleMediaQuery: aboveXsMediaQuery,
            render: ({ information, micpaPerson }) =>
              <CompareCell
                key={micpaPerson.id}
                information={String((information as DocType)?.['email'] ?? '')}
                compare={micpaPerson.email}
              />,
          },
          {
            accessor: 'information.parsed::Experience',
            title: 'Experience',
            width: 200,
            sortable: false,
            visibleMediaQuery: aboveXsMediaQuery,
            render: ({ information, micpaPerson }) =>
              <CompareCell
                key={micpaPerson.id}
                information={String(((information as DocType)?.['parsed::Experience'] as ComponentValue[])?.map(t => t.title)?.join(' ') ?? '')}
                compare={micpaPerson.company}
              />,
          },
          //{
            //accessor: 'information.parsed::Education',
            //title: 'Education',
            //width: 200,
            //sortable: false,
            //visibleMediaQuery: aboveXsMediaQuery,
            //render: ({ information }) => JSON.stringify((information as DocType)?.['parsed::Education'], null, 4) ?? 'No information',
          //},
          //{
            //accessor: 'information.parsed::Skills',
            //title: 'Skills',
            //width: 200,
            //sortable: false,
            //visibleMediaQuery: aboveXsMediaQuery,
            //render: ({ information, micpaPerson }) => (information as { [key: string]: any })?.['parsed::Skills'] ? <CompareCell information={(information as { [key: string]: any })?.['parsed::Skills']} compare={micpaPerson.company} /> : 'No information',
          //},
          //{
            //accessor: 'information.parsed:Organizations',
            //title: 'Organizations',
            //width: 200,
            //sortable: false,
            //visibleMediaQuery: aboveXsMediaQuery,
            //render: ({ information }) => JSON.stringify((information as DocType)?.['parsed::Organizations'], null, 4) ?? 'No information',
          //},
          {
            accessor: 'scrapedAt',
            width: 100,
            ellipsis: true,
            sortable: true,
            render: ({ scrapedAt }) => dayjs(scrapedAt).format('MMMM DD, YYYY'),
          },
        ]}
        records={persons.data?.rows || []}
        page={page}
        onPageChange={setPage}
        recordsPerPageOptions={[]}
        onRecordsPerPageChange={(recordsPerPage) => recordsPerPage}
        totalRecords={persons?.data?.total || 0}
        recordsPerPage={PAGE_SIZE}
        sortStatus={sortStatus}
        onSortStatusChange={handleSortStatusChange}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
        onRowClick={({ id, micpaPerson }) =>
          openModal({
            title: micpaPerson.name,
            classNames: { content: classes.modal, title: classes.modalTitle },
            size: "auto",
            overlayProps: {
              color: theme.colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[2],
              opacity: 0.55,
              blur: 3,
            },
            children: (
              <LinkedinModal id={id} />
            )
          })
        }
      />
    </Box>
  );
}
