import { useEffect } from "react"
import { PasswordInput, Checkbox, Button, Group, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';
import Cookies from "universal-cookie"

import { env } from "../env/client.mjs";
import LoginLayout from "../components/LoginLayout";

interface Props {
    redirectPath?: string;
}

interface FormValues {
  password?: string;
}

const Login = ({ redirectPath }: Props) => {
  const form = useForm({
    initialValues: {
      password: '',
    },
  });
  const cookies = new Cookies()

  const onLogin = ({ password }: FormValues) => {
    cookies.set(env.NEXT_PUBLIC_SITE_READ_COOKIE, password, {
      path: "/",
    })
    window.location.replace(redirectPath ?? "/");
  }
  
  // react strict mode execute useEffect twice only in development
  // might be entering password wrong
  useEffect(() => {
    if (cookies.get(env.NEXT_PUBLIC_SITE_READ_COOKIE)) {
      notifications.clean();
      notifications.cleanQueue();
      notifications.show({
        title: 'Login failed',
        message: 'Password invalid, please try again',
        styles: (theme) => ({
          root: {
            backgroundColor: theme.colors.red[6],
            borderColor: theme.colors.red[6],

            '&::before': { backgroundColor: theme.white },
          },

          title: { color: theme.white },
          description: { color: theme.white },
          closeButton: {
            color: theme.white,
            '&:hover': { backgroundColor: theme.colors.red[7] },
          },
        }),
      });
    }
  }, [])
  
  return (
    <LoginLayout>
      <Box sx={{ minWidth: 400 }} mx="auto">
        <form onSubmit={form.onSubmit(onLogin)}>
          <PasswordInput
            withAsterisk
            label="Password"
            placeholder="Password"
            {...form.getInputProps('password')}
          />

          <Group position="right" mt="md">
            <Button type="submit">Login</Button>
          </Group>
        </form>
      </Box>
    </LoginLayout>
  )
}

export default Login
