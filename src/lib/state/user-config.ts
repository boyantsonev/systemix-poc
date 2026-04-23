import fs from "fs";
import path from "path";
import os from "os";

export interface UserConfig {
  version: string;
  storage: string;
  supabase: {
    url: string | null;
    anonKey: string | null;
  };
  hitl: {
    autoApproveTokenDiffsUnder: number;
    defaultTimeout: string;
  };
  notifications: {
    onDriftDetected: boolean;
    onSyncComplete: boolean;
    slackWebhook: string | null;
  };
  figma: {
    preferDesktopBridge: boolean;
  };
}

export const DEFAULT_CONFIG: UserConfig = {
  version: "1.0",
  storage: "git-tracked",
  supabase: { url: null, anonKey: null },
  hitl: {
    autoApproveTokenDiffsUnder: 3,
    defaultTimeout: "24h",
  },
  notifications: {
    onDriftDetected: false,
    onSyncComplete: false,
    slackWebhook: null,
  },
  figma: {
    preferDesktopBridge: true,
  },
};

const CONFIG_PATH = path.join(os.homedir(), ".systemix", "config.json");

/**
 * Reads ~/.systemix/config.json and returns a parsed UserConfig.
 * Any missing keys are filled in from DEFAULT_CONFIG — existing data is never removed.
 */
export function getUserConfig(): UserConfig {
  let raw: Partial<UserConfig> = {};

  try {
    const content = fs.readFileSync(CONFIG_PATH, "utf-8");
    raw = JSON.parse(content) as Partial<UserConfig>;
  } catch {
    // File missing or unreadable — fall back to defaults entirely
  }

  return deepMerge(DEFAULT_CONFIG, raw) as UserConfig;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

function deepMerge<T extends object>(
  defaults: T,
  overrides: DeepPartial<T>
): T {
  const result = { ...defaults } as Record<string, unknown>;

  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const overrideVal = overrides[key as keyof DeepPartial<T>];
    const defaultVal = defaults[key];

    if (
      overrideVal !== undefined &&
      overrideVal !== null &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal) &&
      typeof defaultVal === "object" &&
      defaultVal !== null
    ) {
      result[key as string] = deepMerge(
        defaultVal as object,
        overrideVal as DeepPartial<object>
      );
    } else if (overrideVal !== undefined) {
      result[key as string] = overrideVal;
    }
  }

  return result as T;
}
