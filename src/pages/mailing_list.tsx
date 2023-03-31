import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { createStyles, Title, Stack, Button, Box } from "@mantine/core";
import ApplicationContainer from "../components/ApplicationContainer";

import { api } from "../utils/api";
import MailingListTable from "../components/MailingList/MailingListTable";
import { AppPageProps } from "./_app";
import { useRouter } from "next/router";
import Login from "./login";

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
  const router = useRouter();

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
          <Box className="flex-1">
            <Title className={classes.title}>
              Mailing list
            </Title>
          </Box>
          <MailingListTable />
        </Stack>
      </ApplicationContainer>
    </>
  );
};

export default Page;
