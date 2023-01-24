import App, { type AppType, type AppProps, AppContext } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import type { NextRouter } from 'next/router';
import { NotificationsProvider } from '@mantine/notifications';
import { Source_Sans_Pro } from '@next/font/google';
import Cookies from "universal-cookie";

const source = Source_Sans_Pro({ weight: ["400", "600"], subsets: ['latin'] })

import { env } from "../env/client.mjs";

import { api } from "../utils/api";

import "../styles/globals.css";

export interface AppPageProps {
  hasReadPermission: boolean;
  session: Session | null;
}

function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<AppPageProps>) {
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

MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  
  // server only
  if (appContext.ctx.req) {
    const { env: serverEnv } = await import("../env/server.mjs");
    const cookies = new Cookies(appContext.ctx.req?.headers?.cookie);
    const password = cookies.get(env.NEXT_PUBLIC_SITE_READ_COOKIE) ?? "";
    appProps.pageProps.hasReadPermission = password === serverEnv.SITE_PASSWORD;
  }
  
  return appProps;
}

export default api.withTRPC(MyApp);
