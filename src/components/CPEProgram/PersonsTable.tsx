import { Drawer, Box, Button, createStyles, Center, Group, Stack, Text, useMantineTheme } from '@mantine/core';
import { useDisclosure } from "@mantine/hooks";
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useState } from 'react';
import { IconEdit, IconTrash, IconTrashX } from '@tabler/icons';
import { MicpaPerson, MicpaLinkedinPerson, MailingList, MailingListsOnPersons, MicpaEducationUnit, MicpaProduct } from '@prisma/client';

import LinkedinPersonTable from "../LinkedinSearch/LinkedinPersonTable";

import { api } from "../../utils/api";
import { PersonsProps } from '../../etl/CreditEarning';

const useStyles = createStyles((theme) => ({
  modal: { width: 300 },
  modalTitle: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
    fontWeight: 700,
  },
  modalLabel: { width: 80 },
}));

const PAGE_SIZE = 20;

type ColumnType = MicpaPerson & { educationUnits: (MicpaEducationUnit & { product: MicpaProduct })[], _count: { educationUnits: number } };

type PersonsTableProps = PersonsProps;

export default function PersonsTable({ keywords, source }: PersonsTableProps) {
  const [sideNav, handlers] = useDisclosure(false);
  const [clicked, setClicked] = useState<MicpaPerson>();
  const { classes } = useStyles();
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'name', direction: 'asc' });
  const theme = useMantineTheme();

  // TODO Reference mantine-datatable for selection actions (mass delete, export etc)
  const [selectedRecords, setSelectedRecords] = useState<ColumnType[]>([]);

  // TODO load list
  const lists = api.cpeProgram.fetchAll.useQuery({ sortStatus: sortStatus, size: PAGE_SIZE, page, keywords: keywords, source: source });

  const {
    breakpoints: { xs: xsBreakpoint },
  } = useMantineTheme();
  const aboveXsMediaQuery = `(min-width: ${xsBreakpoint}px)`;

  const handleSortStatusChange = (status: DataTableSortStatus) => {
    setPage(1);
    setSortStatus(status);
  };

  const now = dayjs();

  const PersonsTable = DataTable<ColumnType>;

  return (<>
    <Box sx={{ height: 650 }}>
      <PersonsTable
        withBorder
        borderRadius="sm"
        withColumnBorders
        striped
        verticalAlignment="top"
        fetching={lists.isFetching}
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
            width: 100,
            ellipsis: true,
            sortable: true,
            render: ({ email }) => email,
          },
          {
            accessor: 'company',
            width: 100,
            ellipsis: true,
            sortable: true,
            render: ({ company }) => company,
          },
          {
            accessor: 'address',
            width: 100,
            ellipsis: true,
            sortable: true,
            render: ({ address }) => address,
          },
          {
            accessor: 'educationUnits._count',
            width: 150,
            sortable: true,
            visibleMediaQuery: aboveXsMediaQuery,
            render: ({ educationUnits }) => <Center>{educationUnits.length}</Center>,
          },
        ]}
        records={lists.data?.rows as ColumnType[] ?? []}
        page={page}
        onPageChange={setPage}
        totalRecords={lists.data?.total ?? 0}
        recordsPerPage={PAGE_SIZE}
        sortStatus={sortStatus}
        onSortStatusChange={handleSortStatusChange}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
        onRowClick={(list, rowIndex) => {
          setClicked(list);
          handlers.open();
        }}
        //rowContextMenu={{
          //items: ({ id, title }) => [
            //{
              //key: 'edit',
              //icon: <IconEdit size={14} />,
              //title: `Edit ${title}`,
              //onClick: () => showNotification({ color: 'orange', message: `Should edit ${title}` }),
            //},
            //{
              //key: 'delete',
              //title: `Delete ${title}`,
              //icon: <IconTrashX size={14} />,
              //color: 'red',
              //onClick: () => showNotification({ color: 'red', message: `Should delete ${title}` }),
            //},
            //{ key: 'divider-1', divider: true },
            //{
              //key: 'deleteMany',
              //hidden: selectedRecords.length <= 1 || !selectedRecords.map((r) => r.id).includes(id),
              //title: `Delete ${selectedRecords.length} selected records`,
              //icon: <IconTrash size={14} />,
              //color: 'red',
              //onClick: () =>
                //showNotification({ color: 'red', message: `Should delete ${selectedRecords.length} records` }),
            //},
          //],
        //}}
      />
    </Box>
    <Drawer
      opened={sideNav}
      onClose={() => handlers.close()}
      title="Mailing list content"
      padding="xl"
      size={800}
      overlayProps={{
        color: theme.colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[2],
        opacity: 0.55,
        blur: 3,
      }}
    >
      {clicked && <LinkedinPersonTable filter={{ mailingLists: { some: { mailingListId: clicked?.id } } }} />}
    </Drawer>
  </>);
}
