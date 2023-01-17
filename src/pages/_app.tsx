import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { NotificationsProvider } from '@mantine/notifications';
import { Source_Sans_Pro } from '@next/font/google';

const source = Source_Sans_Pro({ weight: ["400", "600"], subsets: ['latin'] })

import { api } from "../utils/api";

import "../styles/globals.css";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      theme={{
        /** Put your mantine theme override here */
        colorScheme: 'light',
        fontFamily: source.style.fontFamily,
        headings: { fontFamily: source.style.fontFamily }
      }}
    >
      <NotificationsProvider>
        <ModalsProvider>
          <SessionProvider session={session}>
            <Component {...pageProps} />
          </SessionProvider>
        </ModalsProvider>
      </NotificationsProvider>
    </MantineProvider>
  );
};

export default api.withTRPC(MyApp);
