import { Center, Box, Image, Loader, Button, createStyles, Group, Stack, Text, useMantineTheme, AspectRatio, Card, Select, SelectItem } from '@mantine/core';
import type { Params } from '../../server/api/routers/cpeprogram';
import { closeAllModals } from '@mantine/modals';
import { IconEdit, IconTrash, IconTrashX } from '@tabler/icons';
import { MicpaPerson, MicpaLinkedinPerson, MailingList } from '@prisma/client';
import dayjs from 'dayjs';

import type { DocType } from '../../utils/puppeteer';

import LinkedinPersonTable from "../LinkedinSearch/LinkedinPersonTable";

import { api } from "../../utils/api";
import { useMemo, useState } from 'react';
import MailingListTable from './MailingListTable';

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
  onAdd: ({ id, isNew, title }: { id: string; isNew: boolean; title: string; }) => void
}

export default function AddToMailingListInput({ onAdd }: Props) {
  const utils = api.useContext();
  const [selectedList, setSelectedList] = useState<string | null>(null)
  const [newLists, setNewLists] = useState<{ id: string; value: string; label: string; isNew: boolean }[]>([])

  const lists = api.list.fetchAll.useQuery({
    size: 100000,
    page: 1,
  }, {
    select: (data) => {
      return {
        ...data,
        rows: data.rows.map((row) => {
          return {
            id: row.id,
            value: row.id,
            label: row.title,
            isNew: false
          }
        })
      }
    }
  });

  const handleOnAdd = () => {
    if (selectedList) {
      onAdd({
        id: selectedList,
        isNew: lists.data?.rows.concat(newLists).find(l => l.id === selectedList)?.isNew || false,
        title: selectedList
      })
    }
  }

  return (
    <Stack>
      <Text fz="sm">Add to a mailing list (or a new list)</Text>
      {lists.isSuccess && <Select
        value={selectedList}
        onChange={setSelectedList}
        label="Mailing list"
        data={lists.data.rows.concat(newLists)}
        placeholder="Select items"
        nothingFound="Nothing found"
        searchable
        creatable
        getCreateLabel={(query) => `+ Create ${query}`}
        onCreate={(query) => {
          const item = { id: query, value: query, label: query, isNew: true };
          setNewLists(l => l.concat([item]))
          return item;
        }}
      />}
      <Button onClick={handleOnAdd}>Add to list</Button>
    </Stack>
  );
}
