/**
 * Edyta the sheep (a Pastelki persona: kind, a bit forgetful, says "Beee!") — the speaking guide of the
 * tutorial. Drawn from the Pastelki "sheep" picture (https://pastelki.marchew.work, MIT; groups pk-head,
 * pk-eye-*, pk-mouth kept as in the source).
 *
 *   <Edyta size={180} mouth={…} look={{ x, y }} hop={…} tilt={…} />   (all reanimated shared values)
 *     mouth 0..1   0 = her calm smile, > 0 = mouth open (driven by her voice)
 *     look  -1..1  where her eyes look (x right, y down) — towards what the child should touch
 *     hop   px     lifts her off the ground (a happy hop when the child did it)
 *     tilt  deg    sways her (a "wave" hello, a nod)
 *
 * Idle: slow breathing (a 3.2 s swell) and a tiny head bob. Nothing flashes; Reduce Motion keeps the
 * idle still (ReduceMotion.System).
 */
import { useEffect } from 'react';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const INK = '#4B4453';
const WOOL = '#FAF7F0';
const FACE = '#E3D6CC';
const W = { fill: WOOL, stroke: INK, strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const PUFFS: [number, number, number][] = [
  [24, 46, 12],
  [36, 34, 13],
  [52, 30, 13],
  [68, 34, 13],
  [80, 46, 12],
  [82, 62, 12],
  [70, 74, 12],
  [52, 77, 12],
  [34, 74, 12],
  [20, 62, 12],
];

type Props = {
  size: number;
  mouth: SharedValue<number>;
  look: { x: SharedValue<number>; y: SharedValue<number> };
  hop: SharedValue<number>;
  tilt: SharedValue<number>;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Edyta({ size, mouth, look, hop, tilt }: Props) {
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.set(
      withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }), -1, true),
    );
  }, [breath]);

  const body = useAnimatedStyle(() => ({
    transform: [
      { translateY: (1 - breath.value) * 1.5 - hop.value },
      { rotate: `${tilt.value}deg` },
      { scaleX: 1 + breath.value * 0.015 },
      { scaleY: 1 + breath.value * 0.03 },
    ],
  }));
  const eyeL = useAnimatedProps(() => ({ cx: 45 + look.x.value * 1.5, cy: 54 + look.y.value * 1.3 }));
  const eyeR = useAnimatedProps(() => ({ cx: 57 + look.x.value * 1.5, cy: 54 + look.y.value * 1.3 }));
  const shineL = useAnimatedProps(() => ({ cx: 46.26 + look.x.value * 1.5, cy: 52.74 + look.y.value * 1.3 }));
  const shineR = useAnimatedProps(() => ({ cx: 58.26 + look.x.value * 1.5, cy: 52.74 + look.y.value * 1.3 }));
  const head = useAnimatedStyle(() => ({
    transform: [{ translateY: -breath.value * size * 0.012 }, { rotate: `${(breath.value - 0.5) * 2}deg` }],
  }));
  const open = useAnimatedProps(() => ({ ry: 0.3 + mouth.value * 3.4, opacity: mouth.value > 0.04 ? 1 : 0 }));
  const smile = useAnimatedProps(() => ({ opacity: mouth.value > 0.04 ? 0 : 1 }));

  return (
    <Animated.View style={[{ width: size, height: size, transformOrigin: 'bottom' }, body]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <G>
          {[32, 44, 58, 70].map((x) => (
            <Path key={x} d={`M${x} 80 V90`} stroke={INK} strokeWidth={10} strokeLinecap="round" />
          ))}
          {[32, 44, 58, 70].map((x) => (
            <Path key={`i${x}`} d={`M${x} 80 V90`} stroke="#585860" strokeWidth={4} strokeLinecap="round" />
          ))}
        </G>
        {PUFFS.map(([cx, cy, r]) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} {...W} />
        ))}
        {PUFFS.map(([cx, cy, r]) => (
          <Circle key={`f${cx}-${cy}`} cx={cx} cy={cy} r={r - 2} fill={WOOL} />
        ))}
        <Ellipse cx={51} cy={55} rx={30} ry={22} fill={WOOL} />
        <Path d="M28 42 C30 37 34 33 39 31" fill="none" stroke="#D6D7DB" strokeWidth={3.5} strokeLinecap="round" />
      </Svg>
      <Animated.View style={[{ position: 'absolute', width: size, height: size, transformOrigin: '51% 70%' }, head]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* pk-head */}
          <Ellipse cx={30} cy={50} rx={9} ry={5} {...W} fill={FACE} transform="rotate(25 30 50)" />
          <Ellipse cx={72} cy={50} rx={9} ry={5} {...W} fill={FACE} transform="rotate(-25 72 50)" />
          <Ellipse cx={51} cy={56} rx={15} ry={17} {...W} fill={FACE} />
          <Circle cx={45} cy={40} r={6} {...W} strokeWidth={3} />
          <Circle cx={51} cy={38} r={6.5} {...W} strokeWidth={3} />
          <Circle cx={57} cy={40} r={6} {...W} strokeWidth={3} />
          <Ellipse cx={51} cy={43} rx={9} ry={3} fill={WOOL} />
          <Ellipse cx={42} cy={62} rx={3.2} ry={2.24} fill="#F4A3B4" opacity={0.7} />
          <Ellipse cx={60} cy={62} rx={3.2} ry={2.24} fill="#F4A3B4" opacity={0.7} />
          {/* pk-eye-l / pk-eye-r (+ highlights) */}
          <AnimatedCircle animatedProps={eyeL} cx={45} cy={54} r={3.6} fill={INK} />
          <AnimatedCircle animatedProps={eyeR} cx={57} cy={54} r={3.6} fill={INK} />
          <AnimatedCircle animatedProps={shineL} cx={46.26} cy={52.74} r={1.15} fill="#FFFFFF" />
          <AnimatedCircle animatedProps={shineR} cx={58.26} cy={52.74} r={1.15} fill="#FFFFFF" />
          {/* pk-mouth: the smile at rest, a soft round "o" while she speaks */}
          <AnimatedPath
            animatedProps={smile}
            d="M47.4 64 Q51 67.52 54.6 64"
            stroke={INK}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <AnimatedEllipse animatedProps={open} cx={51} cy={65.4} rx={3.3} ry={0.3} fill="#7A4E5A" stroke={INK} strokeWidth={2} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
