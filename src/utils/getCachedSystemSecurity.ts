import systemSecurityData from "../data/system_security.json";

/**
 * Returns the numeric security status of a system from cached data.
 * Example output: 0.9 for high-sec, 0.0 or below for null-sec, 0.4 for low-sec
 * Returns null if the system is not found.
 */
export async function getCachedSystemSecurity(systemName: string): Promise<number | null> {
  const key = systemName.trim().toLowerCase();

  const matchedEntry = Object.entries(systemSecurityData).find(
    ([name]) => name.trim().toLowerCase() === key
  );

  if (!matchedEntry) {
    console.warn(`[SECURITY_LOOKUP] System "${systemName}" not found in cache.`);
    return null;
  }

  const value = matchedEntry[1];
  return typeof value === "number" && !isNaN(value) ? value : null;
}
