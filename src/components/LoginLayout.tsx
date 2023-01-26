import { createStyles, Title, Text, Center, Button, Container, Group } from '@mantine/core';

const useStyles = createStyles((theme) => ({
  root: {
    paddingTop: 80,
    paddingBottom: 80,
  },

  label: {
    textAlign: 'center',
    fontWeight: 900,
    fontSize: 220,
    lineHeight: 1,
    marginBottom: theme.spacing.xl * 1.5,
    color: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2],

    [theme.fn.smallerThan('sm')]: {
      fontSize: 120,
    },
  },

  title: {
    textAlign: 'center',
    fontWeight: 900,
    fontSize: 38,

    [theme.fn.smallerThan('sm')]: {
      fontSize: 32,
    },
  },

  description: {
    maxWidth: 500,
    margin: 'auto',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl * 1.5,
  },
}));

interface Props {
  children?: React.ReactNode;
}

export default function LoginLayout({ children }: Props) {
  const { classes } = useStyles();

  return (
    <Container className={classes.root}>
      <div className={classes.label}>Protected</div>
      <Title className={classes.title}>You are not authorized to access this page.</Title>
      <Text color="dimmed" size="lg" align="center" className={classes.description}>
        Please enter the password to login.
      </Text>
      <Center>
        { children }
      </Center>
    </Container>
  );
}