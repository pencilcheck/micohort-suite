import { Center, Box, Button, createStyles, Group, Stack, Text, useMantineTheme } from '@mantine/core';
import { closeAllModals, openModal } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useState } from 'react';
import { IconEdit, IconTrash, IconTrashX } from '@tabler/icons';
import { MicpaPerson, MicpaLinkedinPerson } from '@prisma/client';

import { api } from "../../utils/api";
import { JSONObject } from 'superjson/dist/types';

const useStyles = createStyles((theme) => ({
  modal: { width: 800, height: "100%" },
  modalTitle: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
    fontWeight: 700,
  },
  modalLabel: { width: 80 },
}));

const PAGE_SIZE = 100;

export default function LinkedinTable() {
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'micpaPerson.name', direction: 'asc' });

  const handleSortStatusChange = (status: DataTableSortStatus) => {
    setPage(1);
    setSortStatus(status);
  };

  const persons = api.person.fetchAllLinkedinPersons.useQuery({ sortStatus: sortStatus, size: PAGE_SIZE, page });

  const [selectedRecords, setSelectedRecords] = useState<(MicpaLinkedinPerson & {
    micpaPerson: MicpaPerson;
  })[]>([]);

  const {
    breakpoints: { xs: xsBreakpoint },
  } = useMantineTheme();
  const aboveXsMediaQuery = `(min-width: ${xsBreakpoint}px)`;

  const { classes } = useStyles();
  const now = dayjs();

  return (
    // place the data table in a height-restricted container to make it vertically-scrollable
    <Box sx={{ height: 500 }}>
      <DataTable
        withBorder
        borderRadius="sm"
        withColumnBorders
        striped
        verticalAlignment="top"
        fetching={persons.isFetching}
        columns={[
          {
            accessor: 'micpaPerson.id',
            width: 50,
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'micpaPerson.name',
            width: 100,
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'micpaPerson.email',
            width: 150,
            sortable: true,
            visibleMediaQuery: aboveXsMediaQuery,
          },
          {
            accessor: 'micpaPerson.company',
            title: 'Company',
            width: 150,
            sortable: true,
            visibleMediaQuery: aboveXsMediaQuery,
          },
          {
            accessor: 'information',
            title: 'Information',
            width: 150,
            sortable: false,
            visibleMediaQuery: aboveXsMediaQuery,
            render: ({ information }) => JSON.stringify(information)
          },
          {
            accessor: 'createdAt',
            width: 100,
            ellipsis: true,
            sortable: true,
            render: ({ createdAt }) => dayjs(createdAt).format('MMMM DD, YYYY'),
          },
        ]}
        records={persons.data?.rows || []}
        page={page}
        onPageChange={setPage}
        totalRecords={persons?.data?.total || 0}
        recordsPerPage={PAGE_SIZE}
        sortStatus={sortStatus}
        onSortStatusChange={handleSortStatusChange}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
        onRowClick={({ information, micpaPerson }) =>
          openModal({
            title: micpaPerson.name,
            classNames: { modal: classes.modal, title: classes.modalTitle },
            children: (
              <Stack>
                <Center>
                  <a target="_blank" rel="noreferrer" href={(information as JSONObject)?.url as string}>Linkedin URL</a>
                </Center>
                <Button onClick={() => closeAllModals()}>Close</Button>
              </Stack>
            )
          })
        }
      />
    </Box>
  );
}