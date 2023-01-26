import App, { type AppType, type AppProps, AppContext } from "next/app";
import toPairs from "lodash/toPairs";
import pick from "lodash/pick";
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
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  
  if (appContext.ctx.req && appContext.ctx.res) {
    // server-side
    const { env: serverEnv } = await import("../env/server.mjs");
    const cookies = new Cookies(appContext.ctx.req?.headers?.cookie);
    const password = String(cookies.get(env.NEXT_PUBLIC_SITE_READ_COOKIE) ?? "");
    (appProps.pageProps as AppPageProps).hasReadPermission = password === serverEnv.SITE_PASSWORD;

    // update client-side cookies from server
    cookies.set(env.NEXT_PUBLIC_SITE_HAS_PERMISSION, password === serverEnv.SITE_PASSWORD);
    const setCookie = toPairs<string>(pick(cookies.getAll(), [env.NEXT_PUBLIC_SITE_HAS_PERMISSION])).map(p => `${p[0]}=${p[1]}`).join('; ');
    appContext.ctx.res.setHeader('Set-Cookie', setCookie);
  } else {
    // read cookies password lock in client-side
    const cookies = new Cookies();
    (appProps.pageProps as AppPageProps).hasReadPermission = JSON.parse(cookies.get(env.NEXT_PUBLIC_SITE_HAS_PERMISSION) as string ?? 'false') as boolean;
  }
  
  return appProps;
}

export default api.withTRPC(MyApp);
