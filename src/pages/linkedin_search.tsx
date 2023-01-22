import { type NextPage } from "next";
import Head from "next/head";
import { signIn, signOut, useSession } from "next-auth/react";
import { createStyles, Title, Stack, Button, Box } from "@mantine/core";
import ApplicationContainer from "../components/ApplicationContainer";

import { api } from "../utils/api";
import LinkedinTable from "../components/LinkedinSearch/LinkedinTable";
import SearchInput from "../components/LinkedinSearch/SearchInput";
import { useEffect, useState } from "react";

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

const Page: NextPage = () => {
  const { classes } = useStyles();
  const [search, setSearch] = useState("");
  
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
              Linkedin scrape profile search
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