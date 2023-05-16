import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from 'next/router';

import { api } from "../utils/api";

import { createStyles, Group, Image, Container, Title, Text, Button, px } from '@mantine/core';

const useStyles = createStyles((theme) => ({
  root: {
    height: '100vh',
    backgroundColor: '#11284b',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundImage:
      'linear-gradient(250deg, rgba(130, 201, 30, 0) 0%, #062343 70%), url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1080&q=80)',
    paddingTop: px(theme.spacing.xl) * 3,
    paddingBottom: px(theme.spacing.xl) * 3,
  },

  inner: {
    display: 'flex',
    justifyContent: 'space-between',

    [theme.fn.smallerThan('md')]: {
      flexDirection: 'column',
    },
  },

  image: {
    [theme.fn.smallerThan('md')]: {
      display: 'none',
    },
  },

  content: {
    paddingTop: px(theme.spacing.xl) * 2,
    paddingBottom: px(theme.spacing.xl) * 2,
    marginRight: px(theme.spacing.xl) * 3,

    [theme.fn.smallerThan('md')]: {
      marginRight: 0,
    },
  },

  title: {
    color: theme.white,
    fontWeight: 900,
    lineHeight: 1.05,
    maxWidth: 500,
    fontSize: 48,

    [theme.fn.smallerThan('md')]: {
      maxWidth: '100%',
      fontSize: 34,
      lineHeight: 1.15,
    },
  },

  description: {
    color: theme.white,
    opacity: 0.75,
    maxWidth: 500,

    [theme.fn.smallerThan('md')]: {
      maxWidth: '100%',
    },
  },

  control: {
    paddingLeft: 50,
    paddingRight: 50,
    fontSize: 22,

    [theme.fn.smallerThan('md')]: {
      width: '100%',
    },
  },
}));

const Home: NextPage = () => {
  const router = useRouter();
  const { classes } = useStyles();
  return (
    <div className={classes.root}>
      <Container size="lg">
        <div className={classes.inner}>
          <div className={classes.content}>
            <Image height={100} width={100} alt="MICPA" src="https://www.micpa.org/ResourcePackages/MICPA/assets/dist/images/MICPA.svg" />
            <Title className={classes.title}>
              An{' '}
              <Text
                component="span"
                inherit
                variant="gradient"
                gradient={{ from: 'pink', to: 'yellow' }}
              >
                advanced ML/AI course analytics
              </Text>{' '}
              cohort portal
            </Title>

            <Text className={classes.description} mt={30}>
            </Text>

            <Group>
              <Button
                onClick={() => void router.push('/mailing_list')}
                variant="gradient"
                gradient={{ from: 'pink', to: 'yellow' }}
                size="xl"
                className={classes.control}
                mt={40}
              >
                Mailing List
              </Button>
              <Button
                onClick={() => void router.push('/linkedin_search')}
                variant="gradient"
                gradient={{ from: 'yellow', to: 'green' }}
                size="xl"
                className={classes.control}
                mt={40}
              >
                Linkedin Search
              </Button>
              <Button
                onClick={() => void router.push('/cpe_program')}
                variant="gradient"
                gradient={{ from: 'yellow', to: 'green' }}
                size="xl"
                className={classes.control}
                mt={40}
              >
                CPE Program
              </Button>
              <Button
                onClick={() => void router.push('/credit_earning')}
                variant="gradient"
                gradient={{ from: 'yellow', to: 'green' }}
                size="xl"
                className={classes.control}
                mt={40}
              >
                Credit Earning
              </Button>
            </Group>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default Home;
