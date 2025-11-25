import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import Spacer from '@/components/Spacer';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { modules } from '../mock/modules';
import { LearnStackParamList } from '../navigation/LearnStackNavigator';

type ModuleDetailScreenProps = {
  navigation: NativeStackNavigationProp<LearnStackParamList, 'ModuleDetail'>;
};

export default function ModuleDetailScreen({ navigation }: ModuleDetailScreenProps) {
  const route = useRoute<RouteProp<LearnStackParamList, 'ModuleDetail'>>();
  const { theme } = useTheme();
  const { getLessonStatus } = useLearningProgress();
  const { moduleId } = route.params;

  const module = useMemo(() => {
    return modules.find((m) => m.id === moduleId);
  }, [moduleId]);

  if (!module) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText>Module not found</ThemedText>
      </View>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Feather name="check-circle" size={20} color={theme.success} />;
      case 'in_progress':
        return <Feather name="circle" size={20} color={theme.primary} style={{ opacity: 0.5 }} />;
      default:
        return <Feather name="circle" size={20} color={theme.border} />;
    }
  };

  const getLessonTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'Quiz';
      case 'simulation':
        return 'Simulation';
      default:
        return 'Lesson';
    }
  };

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.md} />

      <View style={styles.header}>
        <ThemedText style={styles.moduleDescription}>{module.description}</ThemedText>
      </View>

      <Spacer height={Spacing.xl} />

      <ThemedText style={styles.sectionTitle}>Lessons</ThemedText>
      <Spacer height={Spacing.md} />

      {module.lessons.map((lesson, index) => {
        const status = getLessonStatus(lesson.id);

        return (
          <React.Fragment key={lesson.id}>
            <Pressable
              style={({ pressed }) => [
                styles.lessonCard,
                { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => navigation.navigate('Lesson', { lessonId: lesson.id, moduleId })}
            >
              <View style={styles.lessonHeader}>
                <View style={styles.statusIcon}>{getStatusIcon(status)}</View>

                <View style={styles.lessonInfo}>
                  <ThemedText style={styles.lessonTitle}>{lesson.title}</ThemedText>
                  <View style={styles.lessonMeta}>
                    <ThemedText style={[styles.lessonMetaText, { color: theme.textSecondary }]}>
                      {getLessonTypeLabel(lesson.type)} · {lesson.estimatedMinutes} min
                    </ThemedText>
                  </View>
                </View>

                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              </View>
            </Pressable>

            <Spacer height={Spacing.md} />
          </React.Fragment>
        );
      })}

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
  header: {
    paddingHorizontal: Spacing.lg,
  },
  moduleDescription: {
    ...Typography.body,
  },
  sectionTitle: {
    ...Typography.headline,
    paddingHorizontal: Spacing.lg,
  },
  lessonCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: Spacing.md,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonMetaText: {
    ...Typography.footnote,
  },
});
