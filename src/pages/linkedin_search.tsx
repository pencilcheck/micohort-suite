import Head from "next/head";
import { signIn, signOut, useSession } from "next-auth/react";
import { createStyles, Title, Stack, Box, ActionIcon } from "@mantine/core";
import ApplicationContainer from "../components/ApplicationContainer";

import { env } from "../env/client.mjs";
import { api } from "../utils/api";
import LinkedinTable from "../components/LinkedinSearch/LinkedinTable";
//import SearchInput from "../components/LinkedinSearch/SearchInput";
import { useEffect, useState } from "react";
import type { AppPageProps } from "./_app";
import { useRouter } from "next/router";
import Login from "./login";
import { IconAdjustments, IconWalk } from "@tabler/icons";
import { applicationAtom } from "../utils/state";
import { useAtom } from "jotai";
import type { ScrapeResponse } from "../etl/types";

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
  const [micpaPersonId, setMicpaPersonId] = useState<string>();
  const [scrape, setScrape] = useState(false);
  const [application, setApplication] = useAtom(applicationAtom)
  const scrapeMutation = api.linkedinRouter.scrapeLinkedinPersons.useMutation();

  const router = useRouter();

  const handleScrapeClick = () => {
    scrapeMutation.mutate({ scrapeProfiles: application?.scrapeProfiles })
  }
  
  useEffect(() => {
    setMicpaPersonId(router.query.micpaPersonId as string || '');
  }, [router.query.micpaPersonId]);

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
          <Box className="flex-1 flex flex-col justify-between">
            <Title className={classes.title}>
              Linkedin search
            </Title>
            <Box className="flex justify-between w-[100px]">
              <ActionIcon onClick={handleScrapeClick} color="indigo" size="xl" radius="xl" variant="filled">
                <IconWalk size="2.125rem" />
              </ActionIcon>
            </Box>
          </Box>
          {/*<SearchInput value={search} onChange={(e) => setSearch(e.target.value)} />*/}
          <LinkedinTable micpaPersonId={micpaPersonId} />
        </Stack>
      </ApplicationContainer>
    </>
  );
};

export default Page;
