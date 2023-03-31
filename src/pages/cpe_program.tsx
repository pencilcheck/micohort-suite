import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { IconAdjustments, IconAlertCircle } from "@tabler/icons";
import { signIn, signOut, useSession } from "next-auth/react";
import { createStyles, Title, Stack, Button, Box, Drawer, useMantineTheme, MultiSelect, ActionIcon, Alert, SegmentedControl, Group } from "@mantine/core";
import ApplicationContainer from "../components/ApplicationContainer";

import { api } from "../utils/api";
import PersonsTable from "../components/CPEProgram/PersonsTable";
import { AppPageProps } from "./_app";
import { useRouter } from "next/router";
import Login from "./login";
//import { MonthPicker } from "@mantine/dates";

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
  const [period, setPeriod] = useState<[Date | null, Date | null]>([null, null]);
  const [value, setValue] = useState<string[]>([])
  const [source, setSource] = useState<string>("both")
  const [searchOpen, setSearchOpen] = useState(true)
  const keywordDropdown = api.cpeProgram.fetchDropdownAll.useQuery();
  const createDropdownMutation = api.cpeProgram.createDropdown.useMutation();


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
        <Stack justify="flex-start" spacing="xs" sx={(theme) => ({ backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0], height: "100%" })}>
          <Box className="flex-1 flex flex-col justify-between">
            <Title className={classes.title}>
              CPE Program
            </Title>
            <ActionIcon onClick={() => setSearchOpen((v) => !v)} color="indigo" size="xl" radius="xl" variant="filled">
              <IconAdjustments size="2.125rem" />
            </ActionIcon>
          </Box>
          <PersonsTable keywords={value} source={source} />
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
              All filters are applied in conjunction.
              Any persons without education units are not returned.
            </Alert>
          <Box className="p-4">
              <SegmentedControl
                value={source}
                onChange={setSource}
                data={[
                  { label: 'Only 3rd-party', value: '3rd-party' },
                  { label: 'Only MICPA', value: 'micpa' },
                  { label: 'Both', value: 'both' },
                ]}
              />
            </Box>
            <MultiSelect
              styles={{
                input: {
                  height: 100
                }
              }}
              label="Keywords appear in any credited courses"
              value={value}
              onChange={setValue}
              data={keywordDropdown.data ?? []}
              placeholder="Select items"
              searchable
              creatable
              getCreateLabel={(query) => `+ Create ${query}`}
              onCreate={(query) => {
                const item = { value: query, label: query };
                createDropdownMutation.mutate({ value: query });
                return item;
              }}
            />
            <Group position="center">
              {/*<MonthPicker type="range" value={period} onChange={setPeriod} />*/}
            </Group>
          </Drawer>
        </Stack>
      </ApplicationContainer>
    </>
  );
};

export default Page;
