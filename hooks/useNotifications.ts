import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

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
  reminderTime: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminders: true,
  achievementAlerts: true,
  weeklyProgress: true,
  reminderTime: '09:00',
};

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<Notifications.PermissionStatus | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

  useEffect(() => {
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
    await Notifications.cancelAllScheduledNotificationsAsync();

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

  const sendAchievementNotification = useCallback(async (title: string, body: string) => {
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

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  return {
    expoPushToken,
    permission,
    settings,
    requestPermission,
    scheduleDailyReminder,
    sendAchievementNotification,
    sendWeeklyProgressNotification,
    updateSettings,
  };
}
