import Head from "next/head";
import { signIn, signOut, useSession } from "next-auth/react";
import { createStyles, Title, Stack, Box } from "@mantine/core";
import ApplicationContainer from "../components/ApplicationContainer";

import { api } from "../utils/api";
import LinkedinTable from "../components/LinkedinSearch/LinkedinTable";
import SearchInput from "../components/LinkedinSearch/SearchInput";
import { useEffect, useState } from "react";
import type { AppPageProps } from "./_app";
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
  const [search, setSearch] = useState("");

  const router = useRouter();
  
  useEffect(() => {
    if (router.query.presearch) setSearch(router.query.presearch as string);
  }, [router.query.presearch]);

  if (!hasReadPermission) {
    return <Login redirectPath={router.asPath} />
  }
  
  return (
    <>
      <Head>
        <title>Linkedin search</title>
        <meta name="description" content="Linkedin search" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ApplicationContainer>
        <Stack justify="flex-start" spacing="xs" sx={(theme) => ({ backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0], height: "100%" })}>
          <Box className="flex-1">
            <Title className={classes.title}>
              Linkedin search
            </Title>
          </Box>
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} />
          <LinkedinTable search={search} />
        </Stack>
      </ApplicationContainer>
    </>
  );
};

export default Page;