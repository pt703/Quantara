import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import Spacer from '@/components/Spacer';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useChallengeProgress } from '@/hooks/useChallengeProgress';
import { useNotifications } from '@/hooks/useNotifications';
import { challenges } from '../mock/challenges';
import { ChallengesStackParamList } from '../navigation/ChallengesStackNavigator';

export default function ChallengeDetailScreen() {
  const route = useRoute<RouteProp<ChallengesStackParamList, 'ChallengeDetail'>>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { getChallengeStatus, setChallengeStatus } = useChallengeProgress();
  const { 
    scheduleChallengeReminder, 
    cancelChallengeReminder,
    sendChallengeCompletedNotification,
  } = useNotifications();
  const { challengeId } = route.params;

  const challenge = useMemo(() => {
    return challenges.find((c) => c.id === challengeId);
  }, [challengeId]);

  if (!challenge) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText>Challenge not found</ThemedText>
      </View>
    );
  }

  const status = getChallengeStatus(challengeId);

  const handleStatusChange = async (newStatus: 'not_started' | 'in_progress' | 'completed') => {
    await setChallengeStatus(challengeId, newStatus);
    
    if (newStatus === 'in_progress' && challenge) {
      await scheduleChallengeReminder(challengeId, challenge.title, 24);
    } else if (newStatus === 'completed') {
      await cancelChallengeReminder(challengeId);
      if (challenge) {
        await sendChallengeCompletedNotification(challenge.title);
      }
      navigation.goBack();
    } else if (newStatus === 'not_started') {
      await cancelChallengeReminder(challengeId);
    }
  };

  const getButtonConfig = () => {
    switch (status) {
      case 'not_started':
        return { text: 'Start Challenge', action: () => handleStatusChange('in_progress') };
      case 'in_progress':
        return { text: 'Mark as Complete', action: () => handleStatusChange('completed') };
      case 'completed':
        return { text: 'Challenge Completed', action: () => {} };
      default:
        return { text: 'Start Challenge', action: () => handleStatusChange('in_progress') };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.md} />

      <View style={styles.content}>
        <ThemedText style={styles.description}>{challenge.description}</ThemedText>

        {challenge.steps && challenge.steps.length > 0 ? (
          <>
            <Spacer height={Spacing.xl} />

            <ThemedText style={styles.stepsTitle}>Steps to complete:</ThemedText>

            <Spacer height={Spacing.md} />

            {challenge.steps.map((step, index) => (
              <React.Fragment key={index}>
                <View style={styles.stepContainer}>
                  <View style={[styles.stepNumber, { backgroundColor: theme.primary + '20' }]}>
                    <ThemedText style={[styles.stepNumberText, { color: theme.primary }]}>
                      {index + 1}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.stepText}>{step}</ThemedText>
                </View>
                <Spacer height={Spacing.md} />
              </React.Fragment>
            ))}
          </>
        ) : null}
      </View>

      <Spacer height={Spacing.xl} />

      <View style={styles.buttonContainer}>
        {status === 'completed' ? (
          <View style={[styles.completedBadge, { backgroundColor: theme.success + '20' }]}>
            <Feather name="check-circle" size={24} color={theme.success} />
            <Spacer width={Spacing.sm} />
            <ThemedText style={[styles.completedText, { color: theme.success }]}>
              Challenge Completed
            </ThemedText>
          </View>
        ) : (
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={buttonConfig.action}
          >
            <ThemedText style={[styles.primaryButtonText, { color: theme.buttonText }]}>
              {buttonConfig.text}
            </ThemedText>
          </Pressable>
        )}
      </View>

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  description: {
    ...Typography.body,
  },
  stepsTitle: {
    ...Typography.headline,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  stepNumberText: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  stepText: {
    ...Typography.body,
    flex: 1,
    paddingTop: 2,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
  },
  primaryButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.headline,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  completedText: {
    ...Typography.headline,
  },
});
