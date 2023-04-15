import { ActionIcon, Box, Button, createStyles, Group, Stack, Text, useMantineTheme } from '@mantine/core';
import { closeAllModals, openModal } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useMemo, useState } from 'react';
import { IconBrandLinkedin, IconEdit, IconEye, IconTrash, IconTrashX } from '@tabler/icons';
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
  onDelete: (personId: string, onSuccess: () => void) => void
}

type ColumnType = MicpaPerson & { linkedinPersons: MicpaLinkedinPerson[]; }

export default function LinkedinPersonTable({ filter, onDelete }: Props) {
  const utils = api.useContext();
  const router = useRouter();
  const { classes } = useStyles();
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<ColumnType[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'name', direction: 'asc' });

  const [selectedRecords, setSelectedRecords] = useState<ColumnType[]>([]);

  // TODO load list of mailing list as well
  // TODO useEffect for selected mailing list for content display
  const persons = api.person.fetchAll.useQuery({ filter, sortStatus: sortStatus, size: PAGE_SIZE, page });

  useMemo(() => {
    if (persons.isSuccess) {
      setRecords(persons.data.rows)
      setTotal(persons.data.total)
    }
  }, [persons.isSuccess, persons.data?.rows])

  const {
    breakpoints: { xs: xsBreakpoint },
  } = useMantineTheme();
  const aboveXsMediaQuery = `(min-width: ${xsBreakpoint}px)`;

  const handleSortStatusChange = (status: DataTableSortStatus) => {
    setPage(1);
    setSortStatus(status);
  };

  const PersonTable = DataTable<ColumnType>;

  const now = dayjs();

  return (
    // place the data table in a height-restricted container to make it vertically-scrollable
    <Box sx={{ height: 500 }}>
      <PersonTable
        withBorder
        borderRadius="sm"
        withColumnBorders
        striped
        verticalAlignment="top"
        fetching={persons.isFetching}
        columns={[
          {
            accessor: 'id',
            width: 100,
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'name',
            ellipsis: true,
            sortable: true,
            render: ({ name }) => name,
          },
          {
            accessor: 'email',
            sortable: true,
            visibleMediaQuery: aboveXsMediaQuery,
          },
          {
            accessor: 'company',
            ellipsis: true,
            sortable: true,
            visibleMediaQuery: aboveXsMediaQuery,
          },
          {
            accessor: 'address',
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
          {
            accessor: 'actions',
            width: 100,
            title: <Text mr="xs">Row actions</Text>,
            textAlignment: 'right',
            render: (person) => (
              <Group spacing={4} position="right" noWrap>
                <ActionIcon color="green" onClick={() => {
                  router.push(`/linkedin_search?presearch=${encodeURIComponent(person.name)}`).catch((e) => console.log(e));
                }}>
                  <IconBrandLinkedin size={16} />
                </ActionIcon>
                {onDelete && <ActionIcon color="red" onClick={() => {
                  onDelete(person.id, () => { utils.person.invalidate().catch(console.log) })
                }}>
                  <IconTrash size={16} />
                </ActionIcon>}
              </Group>
            ),
          },
        ]}
        records={records}
        page={page}
        onPageChange={setPage}
        totalRecords={total}
        recordsPerPage={PAGE_SIZE}
        sortStatus={sortStatus}
        onSortStatusChange={handleSortStatusChange}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
        onRowClick={({ name, email, company, address }) => {
          // TODO open a universal modal that shows graphs and information about this person
          // components/Person/AnalyticsModal.tsx
        }}
      />
    </Box>
  );
}
