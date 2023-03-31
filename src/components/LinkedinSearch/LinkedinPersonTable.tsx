import { Box, Button, createStyles, Group, Stack, Text, useMantineTheme } from '@mantine/core';
import { closeAllModals, openModal } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useState } from 'react';
import { IconEdit, IconTrash, IconTrashX } from '@tabler/icons';
import { Prisma, MicpaPerson, MicpaLinkedinPerson } from '@prisma/client';

import { api } from "../../utils/api";
import { useRouter } from 'next/router';

const useStyles = createStyles((theme) => ({
  modal: { width: 300 },
  modalTitle: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
    fontWeight: 700,
  },
  modalLabel: { width: 80 },
}));

const PAGE_SIZE = 20;

interface Props {
  filter: Prisma.MicpaPersonWhereInput;
}

export default function LinkedinTable({ filter }: Props) {
  const router = useRouter();
  const { classes } = useStyles();
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'name', direction: 'asc' });

  const [selectedRecords, setSelectedRecords] = useState<(MicpaPerson & {
    linkedinPersons: MicpaLinkedinPerson[];
  })[]>([]);

  // TODO load list of mailing list as well
  // TODO useEffect for selected mailing list for content display
  const persons = api.person.fetchAll.useQuery({ filter, sortStatus: sortStatus, size: PAGE_SIZE, page });

  const {
    breakpoints: { xs: xsBreakpoint },
  } = useMantineTheme();
  const aboveXsMediaQuery = `(min-width: ${xsBreakpoint}px)`;

  const handleSortStatusChange = (status: DataTableSortStatus) => {
    setPage(1);
    setSortStatus(status);
  };

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
          /*{*/
            /*accessor: 'score',*/
            /*title: 'Score',*/
            /*width: 80,*/
            /*sortable: true,*/
            /*visibleMediaQuery: aboveXsMediaQuery,*/
            /*cellsStyle: ({ linkedinPersons }) =>*/
              /*linkedinPersons?.[0]?.information*/
                /*? {*/
                    /*fontWeight: 'bold',*/
                    /*color: 'green',*/
                    /*background: '#FF3322',*/
                  /*}*/
                /*: undefined,*/
          /*},*/
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
        onRowClick={({ name, email, company, address }) => {
          // TODO open a universal modal that shows graphs and information about this person
          // components/Person/AnalyticsModal.tsx

          // For now let's just redirect to linkedin search
          router.push(`/linkedin_search?presearch=${encodeURIComponent(name)}`).catch((e) => console.log(e));
        }}
        rowContextMenu={{
          items: ({ id, name, email, company, address }) => [
            {
              key: 'info',
              icon: <IconEdit size={14} />,
              title: `Show info ${name}`,
              onClick: () => 
                openModal({
                  title: name,
                  classNames: { content: classes.modal, title: classes.modalTitle },
                  children: (
                    <Stack>
                      <Group>
                        <Text className={classes.modalLabel} size="sm">
                          Name
                        </Text>
                        <Text size="sm">{name}</Text>
                      </Group>
                      <Group>
                        <Text className={classes.modalLabel} size="sm">
                          Email
                        </Text>
                        <Text size="sm">{email}</Text>
                      </Group>
                      <Group>
                        <Text className={classes.modalLabel} size="sm">
                          Company
                        </Text>
                        <Text size="sm">{company}</Text>
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
            },
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
