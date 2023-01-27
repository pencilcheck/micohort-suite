import { Center, Box, Image, Loader, Button, createStyles, Group, Stack, Text, useMantineTheme, AspectRatio, Card } from '@mantine/core';
import { closeAllModals } from '@mantine/modals';
import { IconEdit, IconTrash, IconTrashX } from '@tabler/icons';
import { MicpaPerson, MicpaLinkedinPerson } from '@prisma/client';
import dayjs from 'dayjs';

import type { DocType } from '../../utils/puppeteer';

import LinkedinPersonTable from "../LinkedinSearch/LinkedinPersonTable";

import { api } from "../../utils/api";

const useStyles = createStyles((theme) => ({
  modal: { width: 800, height: "100%" },
  modalTitle: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
    fontWeight: 700,
  },
  modalLabel: { width: 80 },
  
  card: {
    width: '90%',
    transition: 'transform 150ms ease, box-shadow 150ms ease',

    '&:hover': {
      transform: 'scale(1.01)',
      boxShadow: theme.shadows.md,
    },
  },

  title: {
    fontWeight: 600,
  },
}));

interface Props {
  id: string;
}

export default function LinkedinModal({ id }: Props) {
  const person = api.person.fetchOneLinkedinPerson.useQuery({ id });
  const { classes } = useStyles();

  return (
    <Stack>
      <Center>
        {person.isLoading && <Loader />}
      </Center>
      <Center className="m-8">
        {person.isSuccess && (
          <Card key={person.data?.id} p="md" radius="md" component="a" target="_blank" href={(person.data?.information as DocType).profile_url} className={classes.card}>
            <Image
              src={(person.data?.information as DocType).screenshot || "https://inconsult.com.au/wp-content/uploads/2019/09/female-placeholder.jpg"}
              caption="Click here to open profile URL on linkedin"
            />
            <Text color="dimmed" size="xs" transform="uppercase" weight={700} mt="md">
              {person.data?.scrapedAt ? dayjs(person.data?.scrapedAt).format('MMMM DD, YYYY') : "Haven't scraped yet"}
            </Text>
            <Text className={classes.title} mt={5}>
              {person.data?.micpaPerson?.name}
            </Text>
          </Card>
        )}
      </Center>
      <Button onClick={() => closeAllModals()}>Close</Button>
    </Stack>
  );
}