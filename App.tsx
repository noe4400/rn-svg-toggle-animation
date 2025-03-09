import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSpring,
  useAnimatedProps,
  useDerivedValue,
  interpolateColor,
  withDelay,
} from 'react-native-reanimated';
import { mixPath, parse } from 'react-native-redash';
import Svg, { Path, G } from 'react-native-svg';
import PathProperties from 'svg-path-properties';

const sunColor = '#DBBC79';
const moonColor = '#60A5FA';
const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

const sunPath = parse(
  'M48 66.6667C58.3093 66.6667 66.6667 58.3093 66.6667 48C66.6667 37.6907 58.3093 29.3333 48 29.3333C37.6907 29.3333 29.3333 37.6907 29.3333 48C29.3333 58.3093 37.6907 66.6667 48 66.6667Z'
);
const moonPath = parse(
  'M48 66.6667C58.3093 66.6667 66.6667 58.3093 66.6667 48C47.6753 56.3448 38.6168 48.6759 48 29.3333C37.6907 29.3333 29.3333 37.6907 29.3333 48C29.3333 58.3093 37.6907 66.6667 48 66.6667Z'
);
const raysPaths = [
  //this had to be ordered to show the animation as expected
  'M48 1.33333V10.6667', //first
  'M80.9933 15.0067L74.4133 21.5867', //second ray
  'M85.3333 48H94.6667', //third ray
  'M74.4133 74.4133L80.9933 80.9933', //forth ray
  'M48 85.3333V94.6667', // fifth ray
  'M21.5867 74.4133L15.0067 80.9933', //sixth ray
  'M1.33333 48H10.6667', //seven ray
  'M15.0067 15.0067L21.5867 21.5867', //eight ray
];
const svgHeight = 96;
const svgWidth = 96;

type AnimatedRayProps = {
  path: string;
  index: number;
  isHidden: boolean;
  pathLengh: number;
};

type AnimatedPropsType =
  | { rotation: number; origin: string } // iOS props
  | { transform: ViewStyle['transform']; originX: number; originY: number }; // Android props

const AnimatedRay = ({ path, index, isHidden, pathLengh }: AnimatedRayProps) => {
  const staggeredValue = useDerivedValue(() =>
    withDelay(
      index * 50,
      withTiming(!isHidden ? 1 : 0, {
        duration: 20,
      })
    )
  );

  const animatedProps = useAnimatedProps(() => ({
    opacity: staggeredValue.value,
    strokeOpacity: !isHidden ? staggeredValue.value : 0,
    strokeDashoffset: (pathLengh || 20) * (1 - staggeredValue.value),
  }));

  return <AnimatedPath d={path} animatedProps={animatedProps} />;
};

const App = () => {
  const colorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [pathLengths, setPathLengths] = useState<number[]>([]);

  const mainPathAnimation = useSharedValue(0);
  const rotation = useSharedValue<number>(0); // shared value to rotate the main path needs to be an independent one in order to work

  //rotation on android and ios seems to work different had to change the object base on the platform in order to work as expected
  const animatedRotationProps = useAnimatedProps<AnimatedPropsType>(() => {
    const rotateValue = `${rotation.value}deg`; // Ensure rotation is in degrees only for android
    const originX = svgWidth / 2;
    const originY = svgHeight / 2;
    return Platform.OS === 'ios'
      ? {
          rotation: rotation.value,
          origin: `${originX}, ${originY}`,
        }
      : {
          transform: [
            { translateX: originX },
            { translateY: originY },
            { rotate: rotateValue },
            { translateX: -originX },
            { translateY: -originY },
          ],
          originX,
          originY,
        };
  });

  const mainPath = useDerivedValue(() => {
    return mixPath(mainPathAnimation.value, sunPath, moonPath);
  });

  const animatedProps = useAnimatedProps(() => ({
    d: mainPath.value,
    fill: interpolateColor(mainPathAnimation.value, [0, 1], [sunColor, moonColor], 'RGB'),
    stroke: interpolateColor(mainPathAnimation.value, [0, 1], [sunColor, moonColor], 'RGB'),
  }));

  //measure the lenghs of the rays to be animated
  useEffect(() => {
    const lengths = raysPaths.map((d) => PathProperties.svgPathProperties(d).getTotalLength());
    setPathLengths(lengths);
  }, []);

  useEffect(() => {
    setIsDarkMode(colorScheme === 'dark');
  }, [colorScheme]);

  useEffect(() => {
    mainPathAnimation.value = withSpring(isDarkMode ? 1 : 0);
    rotation.value = withSpring(isDarkMode ? 360 : 0);
  }, [isDarkMode, rotation, mainPathAnimation]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <Pressable
      style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}
      onPress={toggleTheme}>
      <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>
        SVG animation
      </Text>
      <View style={styles.separator} />
      <AnimatedSvg width={svgWidth} height={svgHeight} viewBox="0 0 96 96">
        <AnimatedG animatedProps={animatedRotationProps}>
          <AnimatedPath animatedProps={animatedProps} stroke-width="10" />
        </AnimatedG>

        <AnimatedG stroke={sunColor} strokeWidth="2.5">
          {raysPaths.map((path, index) => (
            <AnimatedRay
              key={index}
              path={path}
              index={index}
              isHidden={isDarkMode}
              pathLengh={pathLengths[index]}
            />
          ))}
        </AnimatedG>
      </AnimatedSvg>
    </Pressable>
  );
};

export default App;

const styles = StyleSheet.create({
  darkContainer: {
    backgroundColor: '#111827',
  },
  lightContainer: {
    backgroundColor: '#f9fafb',
  },
  darkText: {
    color: '#f9fafb',
  },
  lightText: {
    color: '#111827',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  separator: {
    backgroundColor: '#d1d5db',
    height: 1,
    marginVertical: 30,
    width: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
