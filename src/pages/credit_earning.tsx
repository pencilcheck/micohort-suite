import type { NextPage } from "next";
import Head from "next/head";
import { saveAs } from "file-saver";
import { useEffect, useState } from "react";
import { IconAdjustments, IconAlertCircle, IconTableExport } from "@tabler/icons";
import { createStyles, Text, Title, Stack, Button, Box, Drawer, useMantineTheme, ActionIcon, Alert, SegmentedControl, Group, Divider, Select, TextInput, NumberInput } from "@mantine/core";
import ApplicationContainer from "../components/ApplicationContainer";

import { api } from "../utils/api";
import PersonAggEduUnitsTable, { type PersonAggEduUnitsTableProps } from "../components/CreditEarning/PersonAggEduUnitsTable";
import { AppPageProps } from "./_app";
import { useRouter } from "next/router";
import Login from "./login";
import { MonthPicker } from "@mantine/dates";

const useStyles = createStyles((theme) => ({
  title: {
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
    fontSize: 44,
    lineHeight: 1.2,
    fontWeight: 900,

    [theme.fn.smallerThan('xs')]: {
      fontSize: 28,
    },
  },
}));

enum EducationType {
  MI = 'mi',
  OT = 'ot',
  ET = 'et',
  AA = 'aa'
}
type thresholdType = {[key in EducationType]: number}

const Page = ({ hasReadPermission }: AppPageProps) => {
  const { classes } = useStyles();
  const theme = useMantineTheme();
  const router = useRouter();
  const [exportOn, setExportOn] = useState<boolean>(false)
  const [threshold, setThreshold] = useState<thresholdType>({
    aa: 0,
    mi: 0,
    et: 0,
    ot: 0,
  })
  const [totalThreshold, setTotalThreshold] = useState<thresholdType>({
    aa: 0,
    mi: 0,
    et: 0,
    ot: 0,
  })
  const [period, setPeriod] = useState<[Date | null, Date | null]>([new Date((new Date().getFullYear()-1), 3, 1), new Date()]);
  const [validPeriod, setValidPeriod] = useState<[Date, Date]>([new Date((new Date().getFullYear()-1), 3, 1), new Date()]);
  const [memberStatus, setMemberStatus] = useState<PersonAggEduUnitsTableProps["memberStatus"]>("returnAll")
  const [searchOpen, setSearchOpen] = useState(true)
  const excelBlobQuery = api.creditEarning.report.useQuery(
    {
      returnAll: memberStatus === 'returnAll',
      isMember: memberStatus === 'isMember',
      isActive: memberStatus === 'isActive',
      threshold: threshold,
      creditDatePeriod: validPeriod
    },
    { enabled: exportOn }
  );

  useEffect(() => {
    if (excelBlobQuery.isSuccess && exportOn) {
      const blob = new Blob(
        [new Buffer(excelBlobQuery?.data?.buffer?.replace(/^[\w\d;:\/]+base64\,/g, '') || '', 'base64')],
        {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
      );
      saveAs(blob, `report-${memberStatus}-${validPeriod?.[0]?.toISOString() || 'no start date'}-${validPeriod?.[1]?.toISOString() || 'no end date'}.xlsx`);
      setExportOn(false);
    }
  }, [excelBlobQuery, exportOn, memberStatus, validPeriod])

  useEffect(() => {
    if (period[0] && period[1]) {
      setValidPeriod(period as [Date, Date])
    }
  }, [period])

  if (!hasReadPermission) {
    return <Login redirectPath={router.asPath} />
  }

  return (
    <>
      <Head>
        <title>Credit Earning</title>
        <meta name="description" content="Credit Earning" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ApplicationContainer>
        <Stack justify="flex-start" spacing="xs" sx={(theme) => ({ backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0], height: "100%" })}>
          <Box className="flex-1 flex flex-col justify-between">
            <Title className={classes.title}>
              Credit Earning
            </Title>
            <Box className="flex justify-between w-[100px]">
              <ActionIcon onClick={() => setSearchOpen((v) => !v)} color="indigo" size="xl" radius="xl" variant="filled">
                <IconAdjustments size="2.125rem" />
              </ActionIcon>
            </Box>
          </Box>
          <PersonAggEduUnitsTable
            memberStatus={memberStatus}
            thresholdOfAggregatedEduUnits={totalThreshold}
            thresholdPerEducationUnit={threshold}
            creditDatePeriod={validPeriod}
          />
          <Drawer
            position="right"
            opened={searchOpen}
            onClose={() => setSearchOpen(false)}
            title="Filter"
            padding="xl"
            size={360}
            overlayProps={{
              color: theme.colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[2],
              opacity: 0.25,
              blur: 0
            }}
            closeOnClickOutside
          >
            <Alert icon={<IconAlertCircle size="1rem" />} title="Warning!" color="red">
              All filters are applied in conjunction.<br />
              Any persons without education units are not returned.<br />
              <b>Big date range query will likely to timeout, if timeout, try smaller queries.</b>
            </Alert>
            <Text fz="sm">Member status</Text>
            <Box className="p-4">
              <SegmentedControl
                value={memberStatus}
                onChange={(v) => setMemberStatus(v as PersonAggEduUnitsTableProps["memberStatus"])}
                data={[
                  { label: 'Return All', value: 'returnAll' },
                  { label: 'Member', value: 'isMember' },
                  { label: 'Active', value: 'isActive' },
                ]}
              />
            </Box>
            <Divider my="sm" />
            <Text fz="sm">Credited Period</Text>
            <Group position="center">
              <MonthPicker
                type="range"
                value={period}
                onChange={setPeriod}
                minDate={new Date(2017, 1, 1)}
              />
            </Group>
            <Divider my="sm" />
            <Alert icon={<IconAlertCircle size="1rem" />} title="Info" color="yellow">
              Each filter applies to individual education unit.<br />
              <b>All filter applied as a whole, so if a person doesn&apos;t met one of the requirement, it will be grey out.</b>
            </Alert>
            <NumberInput
              defaultValue={0}
              placeholder="4"
              label="Minimum Credit per AA Unit"
              withAsterisk
              value={threshold['aa']}
              onChange={(v) => setThreshold((pv: thresholdType) => ({ ...pv, aa: v || 0 }))}
            />
            <NumberInput
              defaultValue={0}
              placeholder="4"
              label="Minimum Credit per MI Unit"
              withAsterisk
              value={threshold['mi']}
              onChange={(v) => setThreshold((pv: thresholdType) => ({ ...pv, mi: v || 0 }))}
            />
            <NumberInput
              defaultValue={0}
              placeholder="4"
              label="Minimum Credit per ET Unit"
              withAsterisk
              value={threshold['et']}
              onChange={(v) => setThreshold((pv: thresholdType) => ({ ...pv, et: v || 0 }))}
            />
            <NumberInput
              defaultValue={0}
              placeholder="4"
              label="Minimum Credit per OT Unit"
              withAsterisk
              value={threshold['ot']}
              onChange={(v) => setThreshold((pv: thresholdType) => ({ ...pv, ot: v || 0 }))}
            />
            <Divider my="sm" />
            <Alert icon={<IconAlertCircle size="1rem" />} title="Info" color="yellow">
              Each filter applies to aggregated total education units per person, will highlight persons who meet the criteria.<br />
              <b>All filter applied as a whole, so if a person doesn&apos;t met one of the requirement, it will be grey out.</b><br />
              <b className="text-red-600"><em>This will not be applied to export.</em></b>
            </Alert>
            <NumberInput
              defaultValue={0}
              placeholder="4"
              label="Minimum Credit per Total AA"
              withAsterisk
              value={totalThreshold['aa']}
              onChange={(v) => setTotalThreshold((pv: thresholdType) => ({ ...pv, aa: v || 0 }))}
            />
            <NumberInput
              defaultValue={0}
              placeholder="4"
              label="Minimum Credit per Total MI"
              withAsterisk
              value={totalThreshold['mi']}
              onChange={(v) => setTotalThreshold((pv: thresholdType) => ({ ...pv, mi: v || 0 }))}
            />
            <NumberInput
              defaultValue={0}
              placeholder="4"
              label="Minimum Credit per Total ET"
              withAsterisk
              value={totalThreshold['et']}
              onChange={(v) => setTotalThreshold((pv: thresholdType) => ({ ...pv, et: v || 0 }))}
            />
            <NumberInput
              defaultValue={0}
              placeholder="4"
              label="Minimum Credit per Total OT"
              withAsterisk
              value={totalThreshold['ot']}
              onChange={(v) => setTotalThreshold((pv: thresholdType) => ({ ...pv, ot: v || 0 }))}
            />
            <Divider my="sm" />
            <Text fz="sm">Export all to Excel (with filter)</Text>
            <ActionIcon onClick={() => setExportOn(true)} color="orange" size="xl" radius="xl" variant="filled">
              <IconTableExport size="2.125rem" />
            </ActionIcon>
          </Drawer>
        </Stack>
      </ApplicationContainer>
    </>
  );
};

export default Page;
