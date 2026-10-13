export function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    employeeId: row.employee_id,
    department: row.department,
    jobTitle: row.job_title,
    phone: row.phone,
    isActive: row.is_active,
  };
}

export function mapRoles(roleRows) {
  return (roleRows ?? []).map((row) => row.role).filter(Boolean);
}
