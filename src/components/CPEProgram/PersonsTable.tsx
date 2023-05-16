import { Drawer, Box, Button, createStyles, Center, Group, Stack, Text, useMantineTheme } from '@mantine/core';
import { useDisclosure } from "@mantine/hooks";
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import { IconEdit, IconTrash, IconTrashX } from '@tabler/icons';

import LinkedinPersonTable from "../LinkedinSearch/LinkedinPersonTable";

import { api, RouterOutputs } from "../../utils/api";
import type { Params } from '../../server/api/routers/cpeprogram';
import EducationUnitsTable from './EducationUnitsTable';

const useStyles = createStyles((theme) => ({
  modal: { width: 300 },
  modalTitle: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
    fontWeight: 700,
  },
  modalLabel: { width: 80 },
}));

const PAGE_SIZE = 20;

type ColumnType = RouterOutputs['cpeProgram']['fetchAllPersonIds'][0];

type PersonsTableProps = Params;

export default function PersonsTable({ keywords, source, creditDatePeriod }: PersonsTableProps) {
  const [sideNav, handlers] = useDisclosure(false);
  const [clicked, setClicked] = useState<ColumnType>();
  const { classes } = useStyles();
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'name', direction: 'asc' });
  const [data, setData] = useState<ColumnType[]>([]);
  const [total, setTotal] = useState(0);
  const theme = useMantineTheme();

  // TODO Reference mantine-datatable for selection actions (mass delete, export etc)
  const [selectedRecords, setSelectedRecords] = useState<ColumnType[]>([]);

  // on render.com, longer timeout
  const totalQuery = api.cpeProgram.fetchAllCount.useQuery({ keywords, source, creditDatePeriod });
  const persons = api.cpeProgram.fetchAllPersonIds.useQuery({ sortStatus: sortStatus, size: PAGE_SIZE, page, keywords, source, creditDatePeriod });

  useEffect(() => {
    if (persons.isSuccess && !!persons.data) {
      setData(persons.data);
    }
  }, [persons.isSuccess])

  useEffect(() => {
    if (totalQuery.isSuccess) {
      setTotal(totalQuery.data ?? 0);
    }
  }, [totalQuery.isSuccess])

  const {
    breakpoints: { xs: xsBreakpoint },
  } = useMantineTheme();
  const aboveXsMediaQuery = `(min-width: ${xsBreakpoint}px)`;

  const handleSortStatusChange = (status: DataTableSortStatus) => {
    setPage(1);
    setSortStatus(status);
  };

  const PersonsTable = DataTable<ColumnType>;

  return (<>
    <Box sx={{ height: 650 }}>
      <PersonsTable
        withBorder
        borderRadius="sm"
        withColumnBorders
        striped
        verticalAlignment="top"
        fetching={persons.isFetching}
        columns={[
          {
            accessor: 'id',
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'name',
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'email',
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'company',
            width: 200,
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'address',
            width: 200,
            ellipsis: true,
            sortable: true,
          },
          //{
            //accessor: '_count.educationUnits',
            //sortable: true,
            //render: ({ _count }) => <Center>{_count.educationUnits}</Center>,
          //},
        ]}
        records={data}
        page={page}
        onPageChange={setPage}
        totalRecords={total}
        recordsPerPage={PAGE_SIZE}
        sortStatus={sortStatus}
        onSortStatusChange={handleSortStatusChange}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
        onRowClick={(record, rowIndex) => {
          setClicked(record);
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
      title="Education units credited"
      padding="xl"
      size={800}
      overlayProps={{
        color: theme.colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[2],
        opacity: 0.55,
        blur: 3,
      }}
    >
      {clicked && <EducationUnitsTable id={clicked.id} keywords={keywords} creditDatePeriod={creditDatePeriod} />}
    </Drawer>
  </>);
}
