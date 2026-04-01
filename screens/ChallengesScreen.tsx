import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import Spacer from '@/components/Spacer';
import { Spacing, Typography, BorderRadius, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useChallengeProgress } from '@/hooks/useChallengeProgress';
import { challenges } from '../mock/challenges';
import { ChallengesStackParamList } from '../navigation/ChallengesStackNavigator';

type ChallengesScreenProps = {
  navigation: NativeStackNavigationProp<ChallengesStackParamList, 'Challenges'>;
};

const CATEGORY_ICONS: Record<string, string> = {
  spending: 'credit-card',
  debt: 'file-text',
  subscriptions: 'repeat',
  saving: 'target',
};

const CATEGORY_COLORS: Record<string, string> = {
  spending: '#2563EB',
  debt: '#F59E0B',
  subscriptions: '#EF4444',
  saving: '#10B981',
};

function EmptyState({ message }: { message: string }) {
  const { theme } = useTheme();
  return (
    <View style={[emptyStyles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <Feather name="inbox" size={28} color={theme.textSecondary} />
      <ThemedText style={[emptyStyles.text, { color: theme.textSecondary }]}>{message}</ThemedText>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: {
    ...Typography.subhead,
    textAlign: 'center',
  },
});

export default function ChallengesScreen({ navigation }: ChallengesScreenProps) {
  const { theme } = useTheme();
  const { getChallengeStatus } = useChallengeProgress();

  const categorizedChallenges = useMemo(() => {
    const challengesWithStatus = challenges.map((challenge) => ({
      ...challenge,
      status: getChallengeStatus(challenge.id),
    }));

    return {
      active: challengesWithStatus.filter((c) => c.status === 'in_progress'),
      suggested: challengesWithStatus.filter((c) => c.status === 'not_started'),
      completed: challengesWithStatus.filter((c) => c.status === 'completed'),
    };
  }, [getChallengeStatus]);

  const allEmpty =
    categorizedChallenges.active.length === 0 &&
    categorizedChallenges.suggested.length === 0 &&
    categorizedChallenges.completed.length === 0;

  const renderChallenge = (challenge: typeof challenges[0] & { status: string }) => {
    const color = CATEGORY_COLORS[challenge.category] ?? '#2563EB';
    const stepCount = (challenge as any).steps?.length ?? 0;
    const isActive = challenge.status === 'in_progress';
    const isCompleted = challenge.status === 'completed';

    return (
      <React.Fragment key={challenge.id}>
        <Pressable
          style={({ pressed }) => [
            styles.challengeCard,
            Shadows.sm,
            { backgroundColor: theme.card, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => navigation.navigate('ChallengeDetail', { challengeId: challenge.id })}
        >
          {isActive && (
            <View style={[styles.activeStrip, { backgroundColor: color }]} />
          )}

          <View style={styles.challengeHeader}>
            <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
              <Feather
                name={CATEGORY_ICONS[challenge.category] as any}
                size={20}
                color={color}
              />
            </View>

            <View style={styles.challengeInfo}>
              <ThemedText style={styles.challengeTitle} numberOfLines={2}>
                {challenge.title}
              </ThemedText>

              <View style={styles.metaRow}>
                {isCompleted ? (
                  <View style={[styles.statusPill, { backgroundColor: '#10B98120' }]}>
                    <Feather name="check-circle" size={11} color="#10B981" />
                    <ThemedText style={[styles.statusPillText, { color: '#10B981' }]}>
                      Completed
                    </ThemedText>
                  </View>
                ) : isActive ? (
                  <View style={[styles.statusPill, { backgroundColor: color + '20' }]}>
                    <View style={[styles.activeDot, { backgroundColor: color }]} />
                    <ThemedText style={[styles.statusPillText, { color }]}>
                      In Progress
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText style={[styles.stepCount, { color: theme.textSecondary }]}>
                    {stepCount} steps
                  </ThemedText>
                )}
              </View>

              {isActive && (
                <View style={styles.progressContainer}>
                  <View style={[styles.progressTrack, { backgroundColor: theme.backgroundTertiary }]}>
                    <View style={[styles.progressFill, { backgroundColor: color, width: '45%' }]} />
                  </View>
                </View>
              )}
            </View>

            {isCompleted ? (
              <Feather name="check-circle" size={20} color="#10B981" />
            ) : (
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            )}
          </View>
        </Pressable>

        <Spacer height={Spacing.md} />
      </React.Fragment>
    );
  };

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.md} />

      {allEmpty ? (
        <>
          <Spacer height={Spacing.xl} />
          <EmptyState message="No challenges yet. Start one to build better money habits." />
        </>
      ) : (
        <>
          <ThemedText style={styles.sectionTitle}>Active</ThemedText>
          <Spacer height={Spacing.md} />
          {categorizedChallenges.active.length > 0
            ? categorizedChallenges.active.map(renderChallenge)
            : <EmptyState message="No active challenges. Pick one from Suggested to get started." />}

          <Spacer height={Spacing.lg} />

          {categorizedChallenges.suggested.length > 0 && (
            <>
              <ThemedText style={styles.sectionTitle}>Suggested</ThemedText>
              <Spacer height={Spacing.md} />
              {categorizedChallenges.suggested.map(renderChallenge)}
              <Spacer height={Spacing.lg} />
            </>
          )}

          {categorizedChallenges.completed.length > 0 && (
            <>
              <ThemedText style={styles.sectionTitle}>Completed</ThemedText>
              <Spacer height={Spacing.md} />
              {categorizedChallenges.completed.map(renderChallenge)}
              <Spacer height={Spacing.lg} />
            </>
          )}
        </>
      )}

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...Typography.headline,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: Spacing.lg,
  },
  challengeCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  activeStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepCount: {
    ...Typography.caption,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: Spacing.sm,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
