import React, { useState } from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ProgressBar } from "@/components/ProgressBar";
import Spacer from "@/components/Spacer";
import { Spacing, Typography, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

const mockLeaderboard = [
  { id: "1", name: "Sarah M.", xp: 2450, streak: 14, rank: 1, avatar: "S" },
  { id: "2", name: "James K.", xp: 2180, streak: 21, rank: 2, avatar: "J" },
  { id: "3", name: "You", xp: 1920, streak: 7, rank: 3, avatar: "Y", isUser: true },
  { id: "4", name: "Emma L.", xp: 1750, streak: 5, rank: 4, avatar: "E" },
  { id: "5", name: "Michael R.", xp: 1580, streak: 3, rank: 5, avatar: "M" },
];

const mockAchievements = [
  { id: "1", title: "First Steps", description: "Complete your first lesson", icon: "award", unlocked: true },
  { id: "2", title: "Quiz Master", description: "Score 100% on 5 quizzes", icon: "star", unlocked: true },
  { id: "3", title: "Week Warrior", description: "7-day learning streak", icon: "zap", unlocked: true },
  { id: "4", title: "Money Saver", description: "Cancel 3 subscriptions", icon: "dollar-sign", unlocked: false },
  { id: "5", title: "Goal Getter", description: "Reach your savings goal", icon: "target", unlocked: false },
  { id: "6", title: "Finance Pro", description: "Complete all modules", icon: "briefcase", unlocked: false },
];

const mockFriendActivity = [
  { id: "1", name: "Sarah", action: "completed Budgeting Basics", time: "2h ago", badge: "Quiz Master" },
  { id: "2", name: "James", action: "canceled 3 subscriptions", time: "5h ago", badge: "Money Saver" },
  { id: "3", name: "Emma", action: "reached 50% savings goal", time: "1d ago", badge: "Goal Getter" },
  { id: "4", name: "Michael", action: "started Debt Management module", time: "1d ago", badge: null },
];

export default function SocialScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"leaderboard" | "achievements" | "friends">("leaderboard");

  const renderLeaderboard = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Weekly Leaderboard</ThemedText>
      <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Compete with friends and stay motivated
      </ThemedText>
      <Spacer height={Spacing.lg} />

      {mockLeaderboard.map((user) => (
        <ThemedView
          key={user.id}
          style={[
            styles.leaderboardCard,
            { backgroundColor: user.isUser ? theme.primary + "15" : theme.card, borderColor: user.isUser ? theme.primary : theme.border },
          ]}
        >
          <View style={styles.rankContainer}>
            <ThemedText style={[styles.rankText, user.rank <= 3 && { color: user.rank === 1 ? "#FFD700" : user.rank === 2 ? "#C0C0C0" : "#CD7F32" }]}>
              {user.rank}
            </ThemedText>
          </View>

          <View style={[styles.avatarCircle, { backgroundColor: theme.primary + "20" }]}>
            <ThemedText style={styles.avatarText}>{user.avatar}</ThemedText>
          </View>

          <View style={styles.userInfo}>
            <ThemedText style={[styles.userName, user.isUser && { color: theme.primary }]}>
              {user.name} {user.isUser && "(You)"}
            </ThemedText>
            <View style={styles.statsRow}>
              <Feather name="zap" size={12} color={theme.warning} />
              <ThemedText style={[styles.statText, { color: theme.textSecondary }]}>
                {user.streak} day streak
              </ThemedText>
            </View>
          </View>

          <View style={styles.xpContainer}>
            <ThemedText style={[styles.xpText, { color: theme.primary }]}>{user.xp}</ThemedText>
            <ThemedText style={[styles.xpLabel, { color: theme.textSecondary }]}>XP</ThemedText>
          </View>
        </ThemedView>
      ))}
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Your Achievements</ThemedText>
      <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Unlock badges as you learn and grow
      </ThemedText>
      <Spacer height={Spacing.lg} />

      <View style={styles.achievementsGrid}>
        {mockAchievements.map((achievement) => (
          <ThemedView
            key={achievement.id}
            style={[
              styles.achievementCard,
              { backgroundColor: theme.card, borderColor: achievement.unlocked ? theme.primary : theme.border, opacity: achievement.unlocked ? 1 : 0.5 },
            ]}
          >
            <View style={[styles.achievementIcon, { backgroundColor: achievement.unlocked ? theme.primary + "20" : theme.border }]}>
              <Feather name={achievement.icon as any} size={24} color={achievement.unlocked ? theme.primary : theme.textSecondary} />
            </View>
            <Spacer height={Spacing.sm} />
            <ThemedText style={styles.achievementTitle}>{achievement.title}</ThemedText>
            <ThemedText style={[styles.achievementDescription, { color: theme.textSecondary }]} numberOfLines={2}>
              {achievement.description}
            </ThemedText>
            {achievement.unlocked && (
              <View style={[styles.unlockedBadge, { backgroundColor: theme.success + "20" }]}>
                <Feather name="check" size={12} color={theme.success} />
                <ThemedText style={[styles.unlockedText, { color: theme.success }]}>Unlocked</ThemedText>
              </View>
            )}
          </ThemedView>
        ))}
      </View>

      <Spacer height={Spacing.xl} />

      <Pressable
        style={({ pressed }) => [styles.shareButton, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}
        onPress={() => alert("Share your achievements with friends!")}
      >
        <Feather name="share-2" size={20} color="#FFFFFF" />
        <ThemedText style={styles.shareButtonText}>Share Achievements</ThemedText>
      </Pressable>
    </View>
  );

  const renderFriends = () => (
    <View style={styles.section}>
      <View style={styles.friendsHeader}>
        <View>
          <ThemedText style={styles.sectionTitle}>Friend Activity</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            See what your friends are up to
          </ThemedText>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addFriendButton, { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="user-plus" size={18} color={theme.primary} />
          <ThemedText style={[styles.addFriendText, { color: theme.primary }]}>Add</ThemedText>
        </Pressable>
      </View>
      <Spacer height={Spacing.lg} />

      {mockFriendActivity.map((activity) => (
        <ThemedView
          key={activity.id}
          style={[styles.activityCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary + "20" }]}>
            <ThemedText style={styles.avatarText}>{activity.name.charAt(0)}</ThemedText>
          </View>

          <View style={styles.activityInfo}>
            <ThemedText style={styles.activityText}>
              <ThemedText style={styles.activityName}>{activity.name}</ThemedText> {activity.action}
            </ThemedText>
            <ThemedText style={[styles.activityTime, { color: theme.textSecondary }]}>{activity.time}</ThemedText>
          </View>

          {activity.badge ? (
            <View style={[styles.badge, { backgroundColor: theme.primary + "15" }]}>
              <Feather name="award" size={12} color={theme.primary} />
              <ThemedText style={[styles.badgeText, { color: theme.primary }]}>{activity.badge}</ThemedText>
            </View>
          ) : null}
        </ThemedView>
      ))}

      <Spacer height={Spacing.xl} />

      <Pressable
        style={({ pressed }) => [styles.inviteButton, { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 }]}
        onPress={() => alert("Invite friends to join Quantara!")}
      >
        <Feather name="send" size={20} color={theme.primary} />
        <ThemedText style={[styles.inviteButtonText, { color: theme.primary }]}>Invite Friends</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <ScreenScrollView>
      <Spacer height={Spacing.lg} />

      <View style={styles.tabContainer}>
        {(["leaderboard", "achievements", "friends"] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[
              styles.tab,
              { backgroundColor: activeTab === tab ? theme.primary : theme.card, borderColor: theme.border },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Feather
              name={tab === "leaderboard" ? "trending-up" : tab === "achievements" ? "award" : "users"}
              size={16}
              color={activeTab === tab ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              style={[styles.tabText, { color: activeTab === tab ? "#FFFFFF" : theme.textSecondary }]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Spacer height={Spacing.xl} />

      {activeTab === "leaderboard" && renderLeaderboard()}
      {activeTab === "achievements" && renderAchievements()}
      {activeTab === "friends" && renderFriends()}

      <Spacer height={Spacing["2xl"]} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  tabText: {
    ...Typography.footnote,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.title,
  },
  sectionSubtitle: {
    ...Typography.subhead,
    marginTop: Spacing.xs,
  },
  leaderboardCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  rankContainer: {
    width: 28,
    alignItems: "center",
  },
  rankText: {
    ...Typography.headline,
    fontWeight: "700",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
  avatarText: {
    ...Typography.headline,
    fontWeight: "600",
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userName: {
    ...Typography.headline,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  statText: {
    ...Typography.caption,
  },
  xpContainer: {
    alignItems: "flex-end",
  },
  xpText: {
    ...Typography.headline,
    fontWeight: "700",
  },
  xpLabel: {
    ...Typography.caption,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  achievementCard: {
    width: "47%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  achievementTitle: {
    ...Typography.headline,
    textAlign: "center",
  },
  achievementDescription: {
    ...Typography.caption,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  unlockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  unlockedText: {
    ...Typography.caption,
    fontWeight: "600",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  shareButtonText: {
    ...Typography.headline,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  friendsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addFriendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  addFriendText: {
    ...Typography.footnote,
    fontWeight: "600",
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  activityInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  activityText: {
    ...Typography.body,
  },
  activityName: {
    fontWeight: "600",
  },
  activityTime: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: "600",
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  inviteButtonText: {
    ...Typography.headline,
    fontWeight: "600",
  },
});
