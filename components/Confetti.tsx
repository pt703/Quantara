import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#FF9FF3', // Pink
  '#54A0FF', // Light Blue
  '#5F27CD', // Purple
  '#00D2D3', // Cyan
];

interface ConfettiPieceProps {
  index: number;
  startX: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  onComplete?: () => void;
  isLast: boolean;
}

function ConfettiPiece({ 
  startX, 
  color, 
  size, 
  delay, 
  duration, 
  rotation,
  onComplete,
  isLast,
}: ConfettiPieceProps) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    const horizontalDrift = (Math.random() - 0.5) * 150;
    
    scale.value = withDelay(delay, withTiming(1, { duration: 200 }));
    
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 100, {
        duration,
        easing: Easing.out(Easing.quad),
      }, (finished) => {
        if (finished && isLast && onComplete) {
          runOnJS(onComplete)();
        }
      })
    );

    translateX.value = withDelay(
      delay,
      withTiming(horizontalDrift, {
        duration,
        easing: Easing.inOut(Easing.sin),
      })
    );

    rotate.value = withDelay(
      delay,
      withTiming(rotation * 360, {
        duration,
        easing: Easing.linear,
      })
    );

    opacity.value = withDelay(
      delay + duration * 0.7,
      withTiming(0, { duration: duration * 0.3 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const isCircle = Math.random() > 0.5;

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        animatedStyle,
        {
          left: startX,
          width: size,
          height: isCircle ? size : size * 0.4,
          backgroundColor: color,
          borderRadius: isCircle ? size / 2 : 2,
        },
      ]}
    />
  );
}

interface ConfettiProps {
  visible: boolean;
  count?: number;
  onComplete?: () => void;
}

export function Confetti({ visible, count = 50, onComplete }: ConfettiProps) {
  const pieces = useMemo(() => {
    if (!visible) return [];
    
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      startX: Math.random() * SCREEN_WIDTH,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 10 + 6,
      delay: Math.random() * 500,
      duration: Math.random() * 2000 + 2000,
      rotation: Math.random() * 8 + 2,
    }));
  }, [visible, count]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece, index) => (
        <ConfettiPiece
          key={piece.id}
          index={index}
          startX={piece.startX}
          color={piece.color}
          size={piece.size}
          delay={piece.delay}
          duration={piece.duration}
          rotation={piece.rotation}
          onComplete={onComplete}
          isLast={index === pieces.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
  },
});
