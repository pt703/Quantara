import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  dailyReminders: boolean;
  achievementAlerts: boolean;
  weeklyProgress: boolean;
  challengeReminders: boolean;
  newContentAlerts: boolean;
  reminderTime: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminders: true,
  achievementAlerts: true,
  weeklyProgress: true,
  challengeReminders: true,
  newContentAlerts: true,
  reminderTime: '09:00',
};

const STORAGE_KEY = '@quantara_notification_settings';

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<Notifications.PermissionStatus | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

  useEffect(() => {
    loadSettings();
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.log('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.log('Error saving notification settings:', error);
    }
  };

  const registerForPushNotifications = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return null;
    }

    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    setPermission(existingStatus);

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      setPermission(status);
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });

      await Notifications.setNotificationChannelAsync('challenges', {
        name: 'Challenge Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });

      await Notifications.setNotificationChannelAsync('content', {
        name: 'New Content',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#8B5CF6',
      });
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId ?? undefined,
      });
      return tokenData.data;
    } catch (error) {
      console.log('Error getting push token:', error);
      return null;
    }
  };

  const requestPermission = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermission(status);
    return status === 'granted';
  }, []);

  const scheduleDailyReminder = useCallback(async (hour: number, minute: number) => {
    if (Platform.OS === 'web') return;
    
    await cancelNotificationsByType('daily_reminder');

    if (!settings.dailyReminders) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to Learn!',
        body: 'Keep your streak alive! Complete a lesson today.',
        data: { type: 'daily_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }, [settings.dailyReminders]);

  const scheduleChallengeReminder = useCallback(async (
    challengeId: string,
    challengeTitle: string,
    delayHours: number = 24
  ) => {
    if (Platform.OS === 'web') return;
    if (!settings.challengeReminders) return;

    const identifier = `challenge_${challengeId}`;
    
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'Challenge Reminder',
        body: `Don't forget your challenge: "${challengeTitle}"`,
        data: { type: 'challenge_reminder', challengeId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delayHours * 60 * 60,
        repeats: true,
      },
    });
  }, [settings.challengeReminders]);

  const cancelChallengeReminder = useCallback(async (challengeId: string) => {
    if (Platform.OS === 'web') return;
    const identifier = `challenge_${challengeId}`;
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  }, []);

  const scheduleAllChallengeReminders = useCallback(async (
    activeChallenges: Array<{ id: string; title: string }>
  ) => {
    if (!settings.challengeReminders) return;

    for (const challenge of activeChallenges) {
      await scheduleChallengeReminder(challenge.id, challenge.title, 24);
    }
  }, [settings.challengeReminders, scheduleChallengeReminder]);

  const sendNewContentNotification = useCallback(async (contentType: 'lesson' | 'challenge', title: string) => {
    if (Platform.OS === 'web') return;
    if (!settings.newContentAlerts) return;

    const body = contentType === 'lesson' 
      ? `New lesson available: "${title}"`
      : `New challenge unlocked: "${title}"`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New Content Available',
        body,
        data: { type: 'new_content', contentType },
      },
      trigger: null,
    });
  }, [settings.newContentAlerts]);

  const sendAchievementNotification = useCallback(async (title: string, body: string) => {
    if (Platform.OS === 'web') return;
    if (!settings.achievementAlerts) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'achievement' },
      },
      trigger: null,
    });
  }, [settings.achievementAlerts]);

  const sendWeeklyProgressNotification = useCallback(async (lessonsCompleted: number, streak: number) => {
    if (Platform.OS === 'web') return;
    if (!settings.weeklyProgress) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Weekly Progress Update',
        body: `Great work! You completed ${lessonsCompleted} lessons and maintained a ${streak}-day streak this week.`,
        data: { type: 'weekly_progress' },
      },
      trigger: null,
    });
  }, [settings.weeklyProgress]);

  const sendChallengeCompletedNotification = useCallback(async (challengeTitle: string) => {
    if (Platform.OS === 'web') return;
    if (!settings.achievementAlerts) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Challenge Completed!',
        body: `Congratulations! You completed "${challengeTitle}"`,
        data: { type: 'challenge_completed' },
      },
      trigger: null,
    });
  }, [settings.achievementAlerts]);

  const cancelNotificationsByType = async (type: string) => {
    if (Platform.OS === 'web') return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.type === type) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  };

  const cancelAllNotifications = useCallback(async () => {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  const getScheduledNotifications = useCallback(async () => {
    if (Platform.OS === 'web') return [];
    return await Notifications.getAllScheduledNotificationsAsync();
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSettings(updated);

    if (Platform.OS === 'web') return;

    if (newSettings.dailyReminders === false) {
      await cancelNotificationsByType('daily_reminder');
    }

    if (newSettings.challengeReminders === false) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        if (notification.content.data?.type === 'challenge_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    }
  }, [settings]);

  return {
    expoPushToken,
    permission,
    settings,
    isLoading,
    requestPermission,
    scheduleDailyReminder,
    scheduleChallengeReminder,
    cancelChallengeReminder,
    scheduleAllChallengeReminders,
    sendNewContentNotification,
    sendAchievementNotification,
    sendWeeklyProgressNotification,
    sendChallengeCompletedNotification,
    cancelAllNotifications,
    getScheduledNotifications,
    updateSettings,
  };
}
