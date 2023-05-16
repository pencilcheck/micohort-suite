import { Image, Navbar, Group, Code, ScrollArea, createStyles } from '@mantine/core';
import {
  IconNotes,
  IconBrandLinkedin,
  IconUsers,
  IconCreditCard
} from '@tabler/icons';
import { LinksGroup } from './NavbarLinksGroup/NavbarLinksGroup';

const mockdata = [
  {
    label: 'Mailing list',
    path: '/mailing_list',
    icon: IconNotes,
  },
  {
    label: 'Linkedin search',
    path: '/linkedin_search',
    icon: IconBrandLinkedin,
  },
  {
    label: 'CPE Program',
    path: '/cpe_program',
    icon: IconUsers,
  },
  {
    label: 'Credit Earning',
    path: '/credit_earning',
    icon: IconCreditCard,
  },
];

const useStyles = createStyles((theme) => ({
  navbar: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white,
    paddingBottom: 0,
  },

  header: {
    padding: theme.spacing.md,
    paddingTop: 0,
    marginLeft: -theme.spacing.md,
    marginRight: -theme.spacing.md,
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
    borderBottom: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
      }`,
  },

  links: {
    marginLeft: -theme.spacing.md,
    marginRight: -theme.spacing.md,
  },

  linksInner: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },

  footer: {
    marginLeft: -theme.spacing.md,
    marginRight: -theme.spacing.md,
    borderTop: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
      }`,
  },
}));

export default function NavBar() {
  const { classes } = useStyles();
  const links = mockdata.map((item) => <LinksGroup {...item} key={item.label} />);

  return (
    <Navbar height={'100%'} width={{ sm: 300 }} p="md" className={classes.navbar}>
      <Navbar.Section className={classes.header}>
        <Group position="apart">
          <Image alt="MICPA" src="https://www.micpa.org/ResourcePackages/MICPA/assets/dist/images/MICPA.svg" />
          <Code sx={{ fontWeight: 700 }}>INTELLIGENT COHORT PORTAL v2.0</Code>
        </Group>
      </Navbar.Section>

      <Navbar.Section grow className={classes.links} component={ScrollArea}>
        <div className={classes.linksInner}>{links}</div>
      </Navbar.Section>

      {/*
      <Navbar.Section className={classes.footer}>
        <UserButton
          image="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=255&q=80"
          name="Ann Nullpointer"
          email="anullpointer@yahoo.com"
        />
      </Navbar.Section>
      */}
    </Navbar>
  );
}
