import Head from "next/head"
import { useRouter } from "next/router"
import Login from "./login"
import { AppPageProps } from "./_app"

export default function Protected({ hasReadPermission }: AppPageProps) {
  const router = useRouter();

  if (!hasReadPermission) {
    return <Login redirectPath={router.asPath} />
  }

  return (
    <div>
      <Head>
        <title>Protected Page</title>
      </Head>

      <main>I am supposed to be protected.</main>
    </div>
  )
}