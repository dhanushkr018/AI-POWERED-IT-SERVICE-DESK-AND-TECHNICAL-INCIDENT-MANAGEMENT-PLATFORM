export const ROLE_LABELS = {
  user: "User",
  support_executive: "Support executive",
  administrator: "Administrator",
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}
