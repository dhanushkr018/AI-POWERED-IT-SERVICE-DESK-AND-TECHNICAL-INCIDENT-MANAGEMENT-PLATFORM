export const INCIDENT_CATEGORIES = [
  "endpoint",
  "operating_system",
  "application",
  "network",
  "login_access",
  "configuration",
  "peripheral",
  "enterprise_application",
  "security",
];

export const APP_ROLES = ["user", "support_executive", "administrator"];

export const PRIVILEGED_ROLES = ["support_executive", "administrator"];

export function assertCategory(category) {
  if (!INCIDENT_CATEGORIES.includes(category)) {
    throw new Error(`Unknown incident category: ${category}`);
  }
}
