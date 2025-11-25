import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import Spacer from '@/components/Spacer';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [reminderNotifications, setReminderNotifications] = useState(true);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          navigation.navigate('Welcome' as never);
        },
      },
    ]);
  };

  const SettingRow = ({
    icon,
    label,
    value,
    onPress,
    showChevron = false,
    showToggle = false,
    onToggle,
  }: {
    icon: string;
    label: string;
    value?: string | boolean;
    onPress?: () => void;
    showChevron?: boolean;
    showToggle?: boolean;
    onToggle?: (value: boolean) => void;
  }) => (
    <Pressable
      style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
      disabled={!onPress && !showToggle}
    >
      <View style={styles.settingLeft}>
        <Feather name={icon as any} size={20} color={theme.textSecondary} />
        <Spacer width={Spacing.md} />
        <ThemedText style={styles.settingLabel}>{label}</ThemedText>
      </View>

      <View style={styles.settingRight}>
        {showToggle && typeof value === 'boolean' && onToggle ? (
          <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={theme.card}
          />
        ) : null}

        {typeof value === 'string' ? (
          <ThemedText style={[styles.settingValue, { color: theme.textSecondary }]}>
            {value}
          </ThemedText>
        ) : null}

        {showChevron ? <Feather name="chevron-right" size={20} color={theme.textSecondary} /> : null}
      </View>
    </Pressable>
  );

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.md} />

      <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>
      <Spacer height={Spacing.md} />

      <ThemedView style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <SettingRow
          icon="bell"
          label="Push Notifications"
          value={notifications}
          showToggle
          onToggle={setNotifications}
        />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <SettingRow
          icon="mail"
          label="Email Notifications"
          value={emailNotifications}
          showToggle
          onToggle={setEmailNotifications}
        />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <SettingRow
          icon="clock"
          label="Challenge Reminders"
          value={reminderNotifications}
          showToggle
          onToggle={setReminderNotifications}
        />
      </ThemedView>

      <Spacer height={Spacing.xl} />

      <ThemedText style={styles.sectionTitle}>Data & Privacy</ThemedText>
      <Spacer height={Spacing.md} />

      <ThemedView style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <SettingRow icon="shield" label="Privacy Policy" showChevron onPress={() => {}} />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <SettingRow icon="file-text" label="Terms of Service" showChevron onPress={() => {}} />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <SettingRow icon="download" label="Download My Data" showChevron onPress={() => {}} />
      </ThemedView>

      <Spacer height={Spacing.xl} />

      <ThemedText style={styles.sectionTitle}>Account</ThemedText>
      <Spacer height={Spacing.md} />

      <ThemedView style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <SettingRow icon="user" label="Edit Profile" showChevron onPress={() => {}} />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Pressable style={styles.settingRow} onPress={handleLogout}>
          <View style={styles.settingLeft}>
            <Feather name="log-out" size={20} color={theme.error} />
            <Spacer width={Spacing.md} />
            <ThemedText style={[styles.settingLabel, { color: theme.error }]}>Log Out</ThemedText>
          </View>
        </Pressable>
      </ThemedView>

      <Spacer height={Spacing.xl} />

      <ThemedText style={styles.sectionTitle}>About</ThemedText>
      <Spacer height={Spacing.md} />

      <ThemedView style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <SettingRow icon="info" label="Version" value="1.0.0" />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <SettingRow icon="help-circle" label="Help & Support" showChevron onPress={() => {}} />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <SettingRow icon="star" label="Rate Quantara" showChevron onPress={() => {}} />
      </ThemedView>

      <Spacer height={Spacing.xl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...Typography.subhead,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    ...Typography.body,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingValue: {
    ...Typography.subhead,
  },
  divider: {
    height: 1,
    marginLeft: 52,
  },
});
