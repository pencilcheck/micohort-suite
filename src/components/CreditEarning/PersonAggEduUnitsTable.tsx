import { Drawer, Box, Button, createStyles, Center, Group, Stack, Text, useMantineTheme } from '@mantine/core';
import { useDisclosure } from "@mantine/hooks";
import { showNotification } from '@mantine/notifications';
import isWithinInterval from 'date-fns/isWithinInterval'

import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import { IconEdit, IconTrash, IconTrashX } from '@tabler/icons';
import { MicpaPerson, MicpaLinkedinPerson, MailingList, MailingListsOnPersons, MicpaEducationUnit, MicpaProduct, MicpaAggregatedEducationUnit } from '@prisma/client';

import { api, RouterOutputs } from "../../utils/api";
import EducationUnitsTable from '../CPEProgram/EducationUnitsTable';

export interface PersonAggEduUnitsTableProps {
  thresholdOfAggregatedEduUnits: {
    aa: number;
    mi: number;
    et: number;
    ot: number;
  };
  thresholdPerEducationUnit: {
    aa: number;
    mi: number;
    et: number;
    ot: number;
  };
  memberStatus: 'returnAll' | 'isMember' | 'isActive';
  creditDatePeriod: [Date, Date];
}

const useStyles = createStyles((theme) => ({
  modal: { width: 300 },
  modalTitle: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
    fontWeight: 700,
  },
  modalLabel: { width: 80 },
}));

const PAGE_SIZE = 20;

type ColumnType = RouterOutputs['creditEarning']['fetchAll'][0][0] & { aa: number; mi: number; et: number; ot: number; };

export default function PersonAggEduUnitsTable({
  thresholdOfAggregatedEduUnits,
  thresholdPerEducationUnit,
  memberStatus,
  creditDatePeriod,
}: PersonAggEduUnitsTableProps) {
  const [sideNav, handlers] = useDisclosure(false);
  const [clicked, setClicked] = useState<MicpaPerson>();
  const { classes } = useStyles();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ColumnType[]>([]);
  const [total, setTotal] = useState(0);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'name', direction: 'asc' });
  const theme = useMantineTheme();

  // TODO Reference mantine-datatable for selection actions (mass delete, export etc)
  const [selectedRecords, setSelectedRecords] = useState<ColumnType[]>([]);

  const persons = api.creditEarning.fetchAll.useQuery({
    returnAll: memberStatus === 'returnAll',
    isMember: memberStatus === 'isMember',
    isActive: memberStatus === 'isActive',
    threshold: thresholdPerEducationUnit,
    creditDatePeriod,
    size: PAGE_SIZE,
    page
  });

  useEffect(() => {
    if (persons.isSuccess) {
      const isValid = (unit: MicpaAggregatedEducationUnit) => {
        return isWithinInterval(unit.creditStartAt || new Date(), {
          start: creditDatePeriod[0],
          end: creditDatePeriod[1],
        }) && isWithinInterval(unit.creditEndAt || new Date(), {
          start: creditDatePeriod[0],
          end: creditDatePeriod[1],
        })
      }
      // aggregate data for display
      const computedData = (persons.data?.[0] ?? []).map(record => {
        return {
          ...record,
          aa: record.aggregatedEduUnits.filter(isValid).filter(unit => unit.educationCategory === 'AA').reduce((init, v) => (init + (v?.creditEarned || 0)), 0),
          mi: record.aggregatedEduUnits.filter(isValid).filter(unit => unit.educationCategory === 'MI').reduce((init, v) => (init + (v?.creditEarned || 0)), 0),
          et: record.aggregatedEduUnits.filter(isValid).filter(unit => unit.educationCategory === 'ET').reduce((init, v) => (init + (v?.creditEarned || 0)), 0),
          ot: record.aggregatedEduUnits.filter(isValid).filter(unit => unit.educationCategory === 'OT').reduce((init, v) => (init + (v?.creditEarned || 0)), 0),
        }
      })

      setData(computedData);
      setTotal(persons.data?.[1] ?? 0);
    }
  }, [persons.isSuccess])


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
            render: ({ name }) => name,
          },
          {
            accessor: 'email',
            ellipsis: true,
            sortable: true,
            render: ({ email }) => email,
          },
          {
            accessor: 'company',
            width: 200,
            ellipsis: true,
            sortable: true,
            render: ({ company }) => company,
          },
          {
            accessor: 'address',
            width: 200,
            ellipsis: true,
            sortable: true,
            render: ({ address }) => address,
          },
          {
            accessor: 'aa',
            title: 'Total AA',
            //sortable: true,
            render: ({ aa }) => aa,
          },
          {
            accessor: 'mi',
            title: 'Total MI',
            //sortable: true,
            render: ({ mi }) => mi,
          },
          {
            accessor: 'et',
            title: 'Total ET',
            //sortable: true,
            render: ({ et }) => et,
          },
          {
            accessor: 'ot',
            title: 'Total OT',
            //sortable: true,
            render: ({ ot }) => ot,
          },
        ]}
        records={data}
        page={page}
        onPageChange={setPage}
        totalRecords={total}
        recordsPerPage={PAGE_SIZE}
        sortStatus={sortStatus}
        // this is the color filter for aggregated threshold filter
        rowClassName={({ aa, mi, et, ot }) => (
          (aa < thresholdOfAggregatedEduUnits.aa || mi < thresholdOfAggregatedEduUnits.mi || et < thresholdOfAggregatedEduUnits.et || ot < thresholdOfAggregatedEduUnits.ot)
            ? 'text-gray-200'
            : undefined)}
        onSortStatusChange={handleSortStatusChange}
        selectedRecords={selectedRecords}
        onSelectedRecordsChange={setSelectedRecords}
        onRowClick={(record, rowIndex) => {
          setClicked(record);
          handlers.open();
        }}
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
      {clicked && <EducationUnitsTable id={clicked.id} keywords={[]} creditDatePeriod={creditDatePeriod} />}
    </Drawer>
  </>);
}
