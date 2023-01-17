import { Box, Button, createStyles, Group, Stack, Text, useMantineTheme } from '@mantine/core';
import { closeAllModals, openModal } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useState } from 'react';
import { IconEdit, IconTrash, IconTrashX } from '@tabler/icons';
import { MicpaPerson, MicpaLinkedinPerson } from '@prisma/client';

import { api } from "../../utils/api";

const useStyles = createStyles((theme) => ({
  modal: { width: 300 },
  modalTitle: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
    fontWeight: 700,
  },
  modalLabel: { width: 80 },
}));

const PAGE_SIZE = 100;

export default function LinkedinTable() {
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'name', direction: 'asc' });

  const handleSortStatusChange = (status: DataTableSortStatus) => {
    setPage(1);
    setSortStatus(status);
  };

  // TODO load list of mailing list as well
  // TODO useEffect for selected mailing list for content display
  const persons = api.person.fetchAll.useQuery({ sortStatus: sortStatus, size: PAGE_SIZE, page });

  const [selectedRecords, setSelectedRecords] = useState<(MicpaPerson & {
    linkedinPersons: MicpaLinkedinPerson[];
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
            accessor: 'id',
            width: 50,
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'name',
            width: 100,
            ellipsis: true,
            sortable: true,
            render: ({ name }) => name,
          },
          {
            accessor: 'email',
            width: 150,
            sortable: true,
            visibleMediaQuery: aboveXsMediaQuery,
          },
          {
            accessor: 'company',
            title: 'Company',
            width: 150,
            sortable: true,
            visibleMediaQuery: aboveXsMediaQuery,
          },
          {
            accessor: 'address',
            title: 'Address',
            width: 200,
            sortable: true,
            visibleMediaQuery: aboveXsMediaQuery,
          },
          {
            accessor: 'scrapedAt',
            width: 100,
            ellipsis: true,
            sortable: true,
            render: ({ scrapedAt }) => dayjs(scrapedAt).format('MMMM DD, YYYY'),
          },
          {
            accessor: 'score',
            title: 'Score',
            width: 80,
            sortable: true,
            visibleMediaQuery: aboveXsMediaQuery,
            cellsStyle: ({ linkedinPersons }) =>
              linkedinPersons?.[0]?.information
                ? {
                    fontWeight: 'bold',
                    color: 'green',
                    background: '#FF3322',
                  }
                : undefined,
          },
        ]}
        records={persons.data ? persons.data.rows : []}
        page={page}
        onPageChange={setPage}
        totalRecords={persons.data ? persons.data.total : 0}
        recordsPerPage={PAGE_SIZE}
        sortStatus={sortStatus}
        onSortStatusChange={handleSortStatusChange}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
        onRowClick={({ name, address }) =>
          // TODO open a drawer of mailing list table content
          // https://mantine.dev/core/drawer/
          openModal({
            title: name,
            classNames: { modal: classes.modal, title: classes.modalTitle },
            children: (
              <Stack>
                <Group>
                  <Text className={classes.modalLabel} size="sm">
                    First name
                  </Text>
                  <Text size="sm">{name}</Text>
                </Group>
                <Group>
                  <Text className={classes.modalLabel} size="sm">
                    Last name
                  </Text>
                  <Text size="sm">{name}</Text>
                </Group>
                <Group>
                  <Text className={classes.modalLabel} size="sm">
                    Address
                  </Text>
                  <Text size="sm">{address}</Text>
                </Group>
                <Button onClick={() => closeAllModals()}>Close</Button>
              </Stack>
            ),
          })
        }
        rowContextMenu={{
          items: ({ id, name }) => [
            {
              key: 'edit',
              icon: <IconEdit size={14} />,
              title: `Edit ${name}`,
              onClick: () => showNotification({ color: 'orange', message: `Should edit ${name}` }),
            },
            {
              key: 'delete',
              title: `Delete ${name}`,
              icon: <IconTrashX size={14} />,
              color: 'red',
              onClick: () => showNotification({ color: 'red', message: `Should delete ${name}` }),
            },
            { key: 'divider-1', divider: true },
            {
              key: 'deleteMany',
              hidden: selectedRecords.length <= 1 || !selectedRecords.map((r) => r.id).includes(id),
              title: `Delete ${selectedRecords.length} selected records`,
              icon: <IconTrash size={14} />,
              color: 'red',
              onClick: () =>
                showNotification({ color: 'red', message: `Should delete ${selectedRecords.length} records` }),
            },
          ],
        }}
      />
    </Box>
  );
}