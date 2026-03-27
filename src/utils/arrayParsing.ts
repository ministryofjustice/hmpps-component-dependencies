/**
 * Parses comma-separated values from AppInsights query response into array format.
 * Handles null/empty values and returns as JSON-serializable array.
 *
 * @param value - Comma-separated string value from query (e.g., "queue1,queue2,queue3")
 * @returns Array of string values, empty array if null/empty
 */
export const parseMessagingArray = (value: unknown): string[] => {
  // Handle null/undefined - return empty array
  if (value == null) {
    return []
  }

  // If already an array, return as-is
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean)
  }

  // Convert to string and parse
  const str = String(value).trim()

  // Handle empty or null string
  if (!str) {
    return []
  }

  // Split by comma, trim each value, remove empty strings
  return str
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}
