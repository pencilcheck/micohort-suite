import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { createStyles, Text, Title, Stack, Button, Box, Drawer, useMantineTheme, MultiSelect, ActionIcon, Alert, SegmentedControl, Group, Divider, FileButton } from "@mantine/core";
import ApplicationContainer from "../components/ApplicationContainer";
import { notifications } from '@mantine/notifications';

import { api } from "../utils/api";
import MailingListTable from "../components/MailingList/MailingListTable";
import { AppPageProps } from "./_app";
import { useRouter } from "next/router";
import Login from "./login";
import { IconAdjustments, IconAlertCircle } from "@tabler/icons";
import { useEffect, useState } from "react";
import Papa from "papaparse";

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
  const utils = api.useContext();
  const { classes } = useStyles();
  const theme = useMantineTheme();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [searchOpen, setSearchOpen] = useState(true)
  const importFromFileMutate = api.list.importFromFile.useMutation();

  // we are syncing side effect, so we use useEffect
  useEffect(() => {
    const importFile = () => {
      if (file) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: function (results: { data: { [key: string]: string }[] }) {
            const keys = results.data[0] ? Object.keys(results.data[0]) : [];
            if (keys.includes('Id') || keys.includes('id') || keys.includes('ID')) {
              importFromFileMutate.mutate({
                name: file.name,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                ids: results.data.map<string>(d => d['Id'] || d['id'] || d['ID'] || '')
              },
              {
                onSuccess: () => {
                  notifications.show({
                    title: 'Success',
                    message: `File imported.`,
                  });
                  setFile(null)
                  utils.list.invalidate().catch(console.log);
                }
              })
            } else {
              notifications.show({
                title: 'Warning',
                message: `File isn't formatted correctly. Please refer to help in sidebar.`,
              });
            }
          },
        });
      }
    }
    importFile();
  }, [file])

  if (!hasReadPermission) {
    return <Login redirectPath={router.asPath} />
  }

  return (
    <>
      <Head>
        <title>Mailing list</title>
        <meta name="description" content="Mailing list" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ApplicationContainer>
        <Stack justify="flex-start" spacing="xs" sx={(theme) => ({ backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0], height: "100%" })}>
          <Box className="flex-1 flex flex-col justify-between">
            <Title className={classes.title}>
              Mailing list
            </Title>
            <Box className="flex justify-between w-[100px]">
              <ActionIcon onClick={() => setSearchOpen((v) => !v)} color="indigo" size="xl" radius="xl" variant="filled">
                <IconAdjustments size="2.125rem" />
              </ActionIcon>
            </Box>
          </Box>
          <MailingListTable />
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
              The file has to be a CSV with headers.<br />
              The CSV file needs to include a field called &quot;id&quot;.<br />
              The casing can be either &quot;Id&quot;, &quot;ID&quot; or &quot;id&quot;.<br />
            </Alert>
            <Divider my="sm" />
            <Text fz="sm">Import from file</Text>
            <FileButton onChange={setFile} accept="text/csv">
              {(props) => <Button {...props}>Upload mailing list</Button>}
            </FileButton>
          </Drawer>
        </Stack>
      </ApplicationContainer>
    </>
  );
};

export default Page;
