import { Center, Box, Image, Loader, Button, createStyles, Group, Stack, Text, useMantineTheme, AspectRatio, Card, Select, SelectItem } from '@mantine/core';
import { closeAllModals } from '@mantine/modals';
import { IconEdit, IconTrash, IconTrashX } from '@tabler/icons';
import { MicpaPerson, MicpaLinkedinPerson, MailingList } from '@prisma/client';
import dayjs from 'dayjs';

import type { DocType } from '../../utils/puppeteer';

import LinkedinPersonTable from "../LinkedinSearch/LinkedinPersonTable";

import { api } from "../../utils/api";
import { useMemo, useState } from 'react';

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
  personIds: string[];
}

export default function AddToMailingListInput({ personIds }: Props) {
  const utils = api.useContext();

  const addUsersToListMutate = api.list.addPersonsToList.useMutation();
  const lists = api.list.fetchAll.useQuery({
    size: 100000,
    page: 1,
  });

  const handleOnAdd = () => {
    //addUsersToListMutate.mutate()
    //utils.list.invalidate().catch(console.log);
  }

  return (
    <Stack>
      <Text fz="sm">Add to a mailing list (or a new list)</Text>
      {lists.isSuccess && <Select
        label="Mailing list"
        data={[]}
        placeholder="Select items"
        nothingFound="Nothing found"
        searchable
        creatable
        getCreateLabel={(query) => `+ Create ${query}`}
        value={null}
        onChange={undefined}
        onCreate={(query) => {
          //const item = { value: { isNew: true, title: query }, label: query } as unknown as SelectItem;
          // create on server mutation
          //setRecords((current) => [...current, item]);
          return query;
        }}
      />}
      <Button onClick={handleOnAdd}>Add to list</Button>
    </Stack>
  );
}
