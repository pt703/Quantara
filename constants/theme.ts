import { Platform } from "react-native";

const primaryColor = "#2563EB";
const primaryLight = "#60A5FA";
const primaryDark = "#1E40AF";

export const Colors = {
  light: {
    primary: primaryColor,
    primaryLight: primaryLight,
    primaryDark: primaryDark,
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    text: "#111827",
    textSecondary: "#6B7280",
    textDisabled: "#9CA3AF",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B7280",
    tabIconSelected: primaryColor,
    link: primaryColor,
    background: "#F9FAFB",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F9FAFB",
    backgroundTertiary: "#F3F4F6",
    border: "#E5E7EB",
    card: "#FFFFFF",
  },
  dark: {
    primary: primaryLight,
    primaryLight: "#93C5FD",
    primaryDark: primaryColor,
    success: "#34D399",
    warning: "#FBBF24",
    error: "#F87171",
    text: "#F9FAFB",
    textSecondary: "#D1D5DB",
    textDisabled: "#9CA3AF",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: primaryLight,
    link: primaryLight,
    background: "#111827",
    backgroundRoot: "#1F2937",
    backgroundDefault: "#1F2937",
    backgroundSecondary: "#374151",
    backgroundTertiary: "#4B5563",
    border: "#374151",
    card: "#1F2937",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 56,
  inputHeight: 50,
  buttonHeight: 50,
};

export const BorderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const Typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: "700" as const,
  },
  title: {
    fontSize: 28,
    fontWeight: "600" as const,
  },
  headline: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 17,
    fontWeight: "400" as const,
  },
  callout: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  subhead: {
    fontSize: 15,
    fontWeight: "400" as const,
  },
  footnote: {
    fontSize: 13,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
