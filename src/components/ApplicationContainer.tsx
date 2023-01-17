import { AppShell, Header } from '@mantine/core';
import Navbar from './Navbar';

interface Props {
  children?: React.ReactNode;
}

export default function ApplicationContainer({ children }: Props) {
  return (
    <AppShell
      padding="md"
      navbar={<Navbar />}
      styles={(theme) => ({
        main: { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0] },
      })}
    >
      { children }
    </AppShell>
  );
}