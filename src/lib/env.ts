/* eslint-disable no-console */

/**
 * Runtime environment validation.
 * Imported by auth.ts and db/index.ts to fail fast on misconfiguration.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredMinLength(name: string, min: number): string {
  const value = required(name);
  if (value.length < min) {
    throw new Error(
      `Environment variable ${name} must be at least ${min} characters (got ${value.length})`,
    );
  }
  return value;
}

export const env = {
  BETTER_AUTH_URL: required("BETTER_AUTH_URL"),
  BETTER_AUTH_SECRET: requiredMinLength("BETTER_AUTH_SECRET", 32),
  NEXT_PUBLIC_APP_URL: required("NEXT_PUBLIC_APP_URL"),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: required("NEXT_PUBLIC_GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET"),
  DATABASE_URL: required("DATABASE_URL"),
} as const;
