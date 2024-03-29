import { Drawer, Box, Button, createStyles, Center, Group, Stack, Text, useMantineTheme, ActionIcon } from '@mantine/core';
import { useDisclosure } from "@mantine/hooks";
import qs from 'query-string'
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useState } from 'react';
import { IconEdit, IconEye, IconFileDownload, IconTrash, IconTrashX } from '@tabler/icons';
import { MicpaPerson, MicpaLinkedinPerson, MailingList, MailingListsOnPersons } from '@prisma/client';

import LinkedinPersonTable from "../LinkedinSearch/LinkedinPersonTable";

import { api } from "../../utils/api";

const useStyles = createStyles((theme) => ({
  modal: { width: 300 },
  modalTitle: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
    fontWeight: 700,
  },
  modalLabel: { width: 80 },
}));

const PAGE_SIZE = 20;

type ColumnType = MailingList & { _count: { persons: number } };

export default function MailingListTable() {
  const [sideNav, handlers] = useDisclosure(false);
  const [clicked, setClicked] = useState<MailingList>();
  const { classes } = useStyles();
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'createdAt', direction: 'desc' });
  const theme = useMantineTheme();


  const deleteMutate = api.list.deleteList.useMutation();
  const deletePersonFromListMutate = api.list.deletePersonFromList.useMutation();

  // TODO Reference mantine-datatable for selection actions (mass delete, export etc)
  const [selectedRecords, setSelectedRecords] = useState<ColumnType[]>([]);

  // TODO load list of mailing list
  const lists = api.list.fetchAll.useQuery({ sortStatus: sortStatus, size: PAGE_SIZE, page });

  const {
    breakpoints: { xs: xsBreakpoint },
  } = useMantineTheme();
  const aboveXsMediaQuery = `(min-width: ${xsBreakpoint}px)`;

  const handleOnPersonDelete = (personId: string, onSuccess: () => void) => {
    if (clicked?.id && personId) {
      deletePersonFromListMutate.mutate({
        personId: personId,
        listId: clicked?.id
      }, {
        onSuccess: () => {
          onSuccess?.();
        }
      })
    }
  }

  const handleSortStatusChange = (status: DataTableSortStatus) => {
    setPage(1);
    setSortStatus(status);
  };

  const now = dayjs();

  const MailingListTable = DataTable<ColumnType>;

  return (<>
    <Box sx={{ height: 650 }}>
      <MailingListTable
        withBorder
        borderRadius="sm"
        withColumnBorders
        striped
        verticalAlignment="top"
        fetching={lists.isFetching || deleteMutate.isLoading}
        columns={[
          {
            accessor: 'id',
            width: 100,
            ellipsis: true,
            sortable: true,
          },
          {
            accessor: 'title',
            width: '100%',
            ellipsis: true,
            sortable: true,
            render: ({ title }) => title,
          },
          {
            accessor: 'createdAt',
            width: '100%',
            ellipsis: true,
            sortable: true,
            render: ({ createdAt }) => createdAt.toDateString(),
          },
          {
            accessor: 'updatedAt',
            width: '100%',
            ellipsis: true,
            sortable: true,
            render: ({ updatedAt }) => updatedAt.toDateString(),
          },
          // a littie trick, as prisma can't order by _count.persons but can do it with persons._count
          {
            accessor: 'persons._count',
            width: '100%',
            sortable: true,
            render: ({ _count }) => _count.persons,
          },
          {
            accessor: 'actions',
            title: <Text mr="xs">Row actions</Text>,
            textAlignment: 'right',
            render: (list) => (
              <Group spacing={4} position="right" noWrap>
                <ActionIcon color="green" onClick={() => {
                  setClicked(list);
                  handlers.open();
                }}>
                  <IconEye size={16} />
                </ActionIcon>
                <ActionIcon color="yellow" onClick={() => {
                  const query = {
                    id: list.id,
                    select: JSON.stringify({
                      name: true,
                      address: true,
                    })
                  }
                  const queryString = qs.stringify(query, {
                    arrayFormat: 'bracket'
                  })
                  const url = `${window.location.origin}/api/list/export?${queryString}`
                  window.open(url);
                }}>
                  <IconFileDownload size={16} />
                </ActionIcon>
                <ActionIcon color="red" onClick={() => {
                  deleteMutate.mutate({ id: list.id }, {
                    onSuccess: () => {
                      lists.refetch().catch(console.log)
                    }
                  })
                }}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
        records={lists.data?.rows ?? []}
        page={page}
        onPageChange={setPage}
        totalRecords={lists.data?.total ?? 0}
        recordsPerPage={PAGE_SIZE}
        sortStatus={sortStatus}
        onSortStatusChange={handleSortStatusChange}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
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
        blur: 3
      }}
    >
      {clicked && <LinkedinPersonTable onDelete={handleOnPersonDelete} filter={{ mailingLists: { some: { mailingListId: clicked?.id } } }} />}
    </Drawer>
  </>);
}
