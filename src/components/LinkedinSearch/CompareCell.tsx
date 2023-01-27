import stringSimilarity from "string-similarity";
import { createStyles, Title, Stack, Button, Box } from "@mantine/core";
import { useSpring, animated } from '@react-spring/web'
import { useState } from "react";

const useStyles = createStyles((theme) => ({
  main: {
    position: 'relative',
    width: '100%',
    height: 50,
    border: '2px solid #272727',
    overflow: 'hidden'
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.red[3] : theme.colors.red[7],
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyCenter: 'center',
    zIndex: 2,
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
  },
  data: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyCenter: 'center',
    opacity: 0.3,
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
  },
}));

interface Props {
  information: string;
  compare: string;
}

export default function CompareCell({ information, compare }: Props) {
  const [animate, setAnimate] = useState(false)
  const { classes } = useStyles();
  const score = stringSimilarity.compareTwoStrings(information.toLowerCase(), compare.toLowerCase())
  const props = useSpring({ width: animate ? score * 100 : 0 })
  setTimeout(() => {
    setAnimate(true);
  }, 1000)
  
  if (!information || !compare) {
    return <span>No information</span>;
  }
  
  return (
    <Stack className={classes.main}>
      <animated.div className={classes.fill} style={props} />
      <animated.div className={classes.content}>{props.width.to(x => x.toFixed(0))}</animated.div>
      <animated.div className={classes.data}>{information} - {compare}</animated.div>
    </Stack>
  )
}