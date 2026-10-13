export const CATEGORY_LABELS = {
  endpoint: "Laptop or desktop",
  operating_system: "Operating system",
  application: "Application crash",
  network: "Network or VPN",
  login_access: "Sign-in or access",
  configuration: "Configuration",
  peripheral: "Monitor, printer, or dock",
  enterprise_application: "Work application",
  security: "Security incident",
};

export const PRIORITY_LABELS = {
  P1: "P1 Critical",
  P2: "P2 High",
  P3: "P3 Medium",
  P4: "P4 Low",
};

export const STATUS_LABELS = {
  NEW: "New",
  TRIAGED: "Triaged",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  WAITING_FOR_USER: "Waiting for you",
  WAITING_FOR_SPECIALIST: "Waiting for a specialist",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
};

export const IMPACT_LABELS = {
  individual: "Only me",
  department: "My department",
  organization: "Many people or a core service",
};

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

export function formatWhen(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
