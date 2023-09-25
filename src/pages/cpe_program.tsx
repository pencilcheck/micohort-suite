import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { saveAs } from "file-saver";
import { useEffect, useMemo, useState } from "react";
import { IconAdjustments, IconAlertCircle, IconTableExport } from "@tabler/icons";
import { createStyles, Text, Title, Stack, Button, Box, Drawer, useMantineTheme, MultiSelect, ActionIcon, Alert, SegmentedControl, Group, Divider, Select, LoadingOverlay } from "@mantine/core";
import ApplicationContainer from "../components/ApplicationContainer";
import { notifications } from '@mantine/notifications';

import { api } from "../utils/api";
import PersonsTable from "../components/CPEProgram/PersonsTable";
import { AppPageProps } from "./_app";
import { useRouter } from "next/router";
import Login from "./login";
import type { Params } from '../server/api/routers/cpeprogram';
import { MonthPicker } from "@mantine/dates";
import { KeywordFilterDropdown } from "@prisma/client";
import AddToMailingListInput from "../components/MailingList/AddToMailingListInput";

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

const Page = ({ hasReadPermission }: AppPageProps) => {
  const { classes } = useStyles();
  const theme = useMantineTheme();
  const router = useRouter();
  const [exportOn, setExportOn] = useState<boolean>(false)
  const [period, setPeriod] = useState<[Date | null, Date | null]>([new Date((new Date().getFullYear()-1), 3, 1), new Date()]);
  const [validPeriod, setValidPeriod] = useState<[Date, Date]>([new Date((new Date().getFullYear()-1), 3, 1), new Date()]);
  const [loading, setLoading] = useState<boolean>(false)
  const [value, setValue] = useState<string[]>([])
  const [source, setSource] = useState<Params["source"]>("both")
  const [searchOpen, setSearchOpen] = useState(true)
  const [keywords, setKeywords] = useState<KeywordFilterDropdown[]>([])
  const keywordDropdown = api.cpeProgram.fetchDropdownAll.useQuery();
  const createDropdownMutation = api.cpeProgram.createDropdown.useMutation();
  const excelBlobQuery = api.cpeProgram.report.useQuery(
    { keywords: value, source: source, creditDatePeriod: validPeriod },
    { enabled: exportOn }
  );

  const addCPEProgramResultToList = api.cpeProgram.addCPEProgramResultToList.useMutation();

  const addSearchResultToList = ({ id, isNew, title }: { id: string; isNew: boolean; title: string; }) => {
    setLoading(true)
    addCPEProgramResultToList.mutate({
      keywords: value,
      source: source,
      creditDatePeriod: validPeriod,
      listId: id,
      isNew: isNew,
      newTitle: title
    }, {
      onSuccess() {
        setLoading(false)
        notifications.show({
          title: 'Added to mailing list',
          message: '',
          styles: (theme) => ({
            root: {
              backgroundColor: theme.colors.green[6],
              borderColor: theme.colors.green[6],

              '&::before': { backgroundColor: theme.white },
            },

            title: { color: theme.white },
            description: { color: theme.white },
            closeButton: {
              color: theme.white,
              '&:hover': { backgroundColor: theme.colors.green[7] },
            },
          }),
        });
      }
    })
  }

  // only execute function if dependency change, and then memorize the return value
  useMemo(() => {
    if (keywordDropdown.isSuccess) {
      setKeywords(keywordDropdown.data);
    }
  }, [keywordDropdown.isSuccess, keywordDropdown.data])

  useEffect(() => {
    if (excelBlobQuery.isSuccess && exportOn) {
      const blob = new Blob(
        [new Buffer(excelBlobQuery?.data?.buffer?.replace(/^[\w\d;:\/]+base64\,/g, '') || '', 'base64')],
        {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
      );
      saveAs(blob, `report-${value.length}keywords-${source || 'both'}-${validPeriod?.[0]?.toISOString() || 'no start date'}-${validPeriod?.[1]?.toISOString() || 'no end date'}.xlsx`);
      setExportOn(false);
    }

    if (!excelBlobQuery.isSuccess && exportOn) {
      notifications.show({
        title: 'Error',
        message: 'Timeout running query to export. Please reduce your query size and try again.',
        styles: (theme) => ({
          root: {
            backgroundColor: theme.colors.red[6],
            borderColor: theme.colors.red[6],

            '&::before': { backgroundColor: theme.white },
          },

          title: { color: theme.white },
          description: { color: theme.white },
          closeButton: {
            color: theme.white,
            '&:hover': { backgroundColor: theme.colors.red[7] },
          },
        }),
      });
    }
  }, [excelBlobQuery, exportOn, source, validPeriod, value])

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
        <title>CPE Program</title>
        <meta name="description" content="CPE Program" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ApplicationContainer>
        <LoadingOverlay visible={loading} overlayBlur={2} />
        <Stack justify="flex-start" spacing="xs" sx={(theme) => ({ backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0], height: "100%" })}>
          <Box className="flex-1 flex flex-col justify-between">
            <Title className={classes.title}>
              CPE Program
            </Title>
            <Box className="flex justify-between w-[100px]">
              <ActionIcon onClick={() => setSearchOpen((v) => !v)} color="indigo" size="xl" radius="xl" variant="filled">
                <IconAdjustments size="2.125rem" />
              </ActionIcon>
            </Box>
          </Box>
          <PersonsTable keywords={value} source={source} creditDatePeriod={validPeriod} />
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
            <Text fz="sm">Source</Text>
            <Box className="p-4">
              <SegmentedControl
                value={source}
                onChange={(v) => setSource(v as Params["source"])}
                data={[
                  { label: 'Only 3rd-party', value: '3rd-party' },
                  { label: 'Only MICPA', value: 'micpa' },
                  { label: 'Both', value: 'both' },
                ]}
              />
            </Box>
            <Divider my="sm" />
            <MultiSelect
              styles={{
                input: {
                  height: 100
                }
              }}
              label="Keywords appear in any credited courses"
              value={value}
              onChange={setValue}
              data={keywords}
              placeholder="Select items"
              searchable
              creatable
              getCreateLabel={(query) => `+ Create ${query}`}
              onCreate={(query) => {
                const item = { id: query, value: query, label: query };
                setKeywords(keywords => ([...keywords, item]))
                createDropdownMutation.mutate({ value: query });
                return item;
              }}
            />
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
            <Text fz="sm">Export all to Excel (with filter)</Text>
            <ActionIcon onClick={() => setExportOn(true)} color="orange" size="xl" radius="xl" variant="filled">
              <IconTableExport size="2.125rem" />
            </ActionIcon>
            <Divider my="sm" />
            <AddToMailingListInput onAdd={addSearchResultToList} />
          </Drawer>
        </Stack>
      </ApplicationContainer>
    </>
  );
};

export default Page;
