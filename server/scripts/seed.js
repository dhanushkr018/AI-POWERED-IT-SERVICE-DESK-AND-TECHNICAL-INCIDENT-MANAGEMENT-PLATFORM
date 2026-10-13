import { config, isSupabaseConfigured } from "../src/config.js";
import { assertCategory } from "../src/domain/taxonomy.js";
import { createSupabaseAdmin } from "../src/lib/supabase.js";

const demoPassword = config.seedDemoPassword;

const people = [
  {
    email: "nina.patel@demo.college",
    fullName: "Nina Patel",
    employeeId: "EMP-1001",
    department: "Finance",
    jobTitle: "Accounts Analyst",
    roles: ["user"],
  },
  {
    email: "arjun.rao@demo.college",
    fullName: "Arjun Rao",
    employeeId: "EMP-1002",
    department: "Mechanical Engineering",
    jobTitle: "Lab Instructor",
    roles: ["user"],
  },
  {
    email: "sneha.kulkarni@demo.college",
    fullName: "Sneha Kulkarni",
    employeeId: "EMP-2001",
    department: "Information Technology",
    jobTitle: "Service Desk Analyst",
    roles: ["user", "support_executive"],
    teams: ["L1_SERVICE_DESK", "ENDPOINT"],
  },
  {
    email: "karan.mehta@demo.college",
    fullName: "Karan Mehta",
    employeeId: "EMP-2002",
    department: "Information Technology",
    jobTitle: "Network Engineer",
    roles: ["user", "support_executive"],
    teams: ["NETWORK", "L2_SUPPORT"],
  },
  {
    email: "latha.subramanian@demo.college",
    fullName: "Latha Subramanian",
    employeeId: "EMP-2003",
    department: "Information Technology",
    jobTitle: "Security Analyst",
    roles: ["user", "support_executive"],
    teams: ["SECURITY", "L3_SUPPORT"],
  },
  {
    email: "divya.krishnan@demo.college",
    fullName: "Divya Krishnan",
    employeeId: "EMP-3001",
    department: "Information Technology",
    jobTitle: "IT Support Manager",
    roles: ["user", "administrator"],
  },
];

const devices = [
  {
    deviceIdentifier: "LT-FIN-0142",
    deviceType: "laptop",
    manufacturer: "Dell",
    model: "Latitude 5450",
    operatingSystem: "Windows 11",
    ownerEmail: "nina.patel@demo.college",
    department: "Finance",
    status: "active",
    warrantyUntil: "2027-06-30",
  },
  {
    deviceIdentifier: "DT-MECH-2208",
    deviceType: "desktop",
    manufacturer: "HP",
    model: "EliteDesk 800",
    operatingSystem: "Windows 11",
    ownerEmail: "arjun.rao@demo.college",
    department: "Mechanical Engineering",
    status: "in_repair",
    warrantyUntil: "2026-12-15",
  },
  {
    deviceIdentifier: "DOCK-MECH-014",
    deviceType: "docking_station",
    manufacturer: "Dell",
    model: "WD19S",
    operatingSystem: null,
    ownerEmail: "arjun.rao@demo.college",
    department: "Mechanical Engineering",
    status: "active",
    warrantyUntil: "2027-03-01",
  },
  {
    deviceIdentifier: "LT-IT-0088",
    deviceType: "laptop",
    manufacturer: "Lenovo",
    model: "ThinkPad L14",
    operatingSystem: "Windows 11",
    ownerEmail: "sneha.kulkarni@demo.college",
    department: "Information Technology",
    status: "active",
    warrantyUntil: "2027-01-20",
  },
];

const incidents = [
  {
    idempotencyKey: "demo-vpn-nina",
    creatorEmail: "nina.patel@demo.college",
    title: "VPN disconnects after the welcome message",
    description: "The VPN client connects, shows a welcome message, then drops the connection within a minute.",
    originalReport: "VPN connects and then immediately disconnects. I can still open public websites.",
    category: "network",
    subcategory: "vpn",
    priority: "P2",
    status: "IN_PROGRESS",
    teamCode: "NETWORK",
    executiveEmail: "karan.mehta@demo.college",
    deviceIdentifier: "LT-FIN-0142",
    errorDetails: "VPN client message: Connection reset by gateway.",
    businessImpact: "Cannot reach the finance file share.",
    affectedUsers: 1,
    troubleshooting: [
      "Confirmed public websites open without VPN",
      "Reconnected once from the office network",
    ],
    hoursAgo: 6,
    messages: [
      {
        senderEmail: "karan.mehta@demo.college",
        body: "I can see the failed connection. I am checking the approved VPN gateway next.",
        internal: false,
      },
      {
        senderEmail: "karan.mehta@demo.college",
        body: "Internal note: the gateway reset matches two other finance laptops this afternoon.",
        internal: true,
      },
    ],
  },
  {
    idempotencyKey: "demo-desktop-arjun",
    creatorEmail: "arjun.rao@demo.college",
    title: "Lab desktop does not power on",
    description: "The desktop in the materials lab shows no power light and no fan movement.",
    originalReport: "The lab desktop will not turn on. The power light stays off even when the charger is connected.",
    category: "endpoint",
    subcategory: "power",
    priority: "P3",
    status: "TRIAGED",
    teamCode: "ENDPOINT",
    executiveEmail: null,
    deviceIdentifier: "DT-MECH-2208",
    errorDetails: null,
    businessImpact: "The afternoon lab cannot use the demonstration desktop.",
    affectedUsers: 18,
    troubleshooting: [
      "Tried a wall outlet that works for another computer",
      "Held the power button for 10 seconds",
    ],
    hoursAgo: 20,
    diagnostic: {
      powerIndicator: "off",
      chargingIndicator: "off",
      errorMessage: null,
    },
  },
  {
    idempotencyKey: "demo-excel-nina",
    creatorEmail: "nina.patel@demo.college",
    title: "Excel closes when a finance workbook opens",
    description: "Excel opens, then closes as soon as the monthly workbook is selected.",
    originalReport: "Excel keeps crashing when I open the monthly workbook. It happens every time.",
    category: "application",
    subcategory: "excel",
    priority: "P3",
    status: "WAITING_FOR_USER",
    teamCode: "L1_SERVICE_DESK",
    executiveEmail: "sneha.kulkarni@demo.college",
    deviceIdentifier: "LT-FIN-0142",
    errorDetails: "Excel closed without an error code.",
    businessImpact: "The monthly reconciliation is paused.",
    affectedUsers: 1,
    troubleshooting: ["Reopened Excel once after saving other work"],
    hoursAgo: 30,
    messages: [
      {
        senderEmail: "sneha.kulkarni@demo.college",
        body: "Please tell me the workbook name and whether a colleague can open the same file.",
        internal: false,
      },
    ],
  },
  {
    idempotencyKey: "demo-login-arjun",
    creatorEmail: "arjun.rao@demo.college",
    title: "Work account is locked",
    description: "The sign-in page says the account is locked after several attempts.",
    originalReport: "I cannot sign in. The page says the account is locked. I did not share my password.",
    category: "login_access",
    subcategory: "account_lockout",
    priority: "P2",
    status: "ASSIGNED",
    teamCode: "L1_SERVICE_DESK",
    executiveEmail: "sneha.kulkarni@demo.college",
    deviceIdentifier: null,
    errorDetails: "Account locked",
    businessImpact: "Cannot open the learning platform before class.",
    affectedUsers: 1,
    troubleshooting: ["Checked Caps Lock", "Stopped after the lockout message"],
    hoursAgo: 3,
  },
  {
    idempotencyKey: "demo-phishing-nina",
    creatorEmail: "nina.patel@demo.college",
    title: "Suspicious email asks for an MFA code",
    description: "An email that looks like IT support asks Nina to reply with an MFA code.",
    originalReport: "I received an email asking me to send my MFA code. I did not reply or open the attachment.",
    category: "security",
    subcategory: "phishing",
    priority: "P1",
    status: "ESCALATED",
    teamCode: "SECURITY",
    executiveEmail: null,
    deviceIdentifier: "LT-FIN-0142",
    errorDetails: null,
    businessImpact: "Possible attempt to access the finance mailbox.",
    affectedUsers: 1,
    troubleshooting: ["Did not click the link", "Did not forward the message"],
    hoursAgo: 2,
    escalation: {
      fromTeam: "L1_SERVICE_DESK",
      toTeam: "SECURITY",
      fromLevel: "L1",
      toLevel: "SECURITY",
      reason: "The report asks for an MFA code, so Security Response must take it.",
    },
  },
  {
    idempotencyKey: "demo-dock-arjun",
    creatorEmail: "arjun.rao@demo.college",
    title: "External monitor is blank when connected through the dock",
    description: "The monitor stays blank through the dock, and it works when the cable is connected directly.",
    originalReport: "My monitor works if I plug it straight into the desktop, but it stays black through the dock.",
    category: "peripheral",
    subcategory: "dock",
    priority: "P4",
    status: "RESOLVED",
    teamCode: "ENDPOINT",
    executiveEmail: "sneha.kulkarni@demo.college",
    deviceIdentifier: "DOCK-MECH-014",
    errorDetails: null,
    businessImpact: "Only one screen is available during lab preparation.",
    affectedUsers: 1,
    troubleshooting: ["Checked that the dock had power", "Connected the monitor directly once"],
    hoursAgo: 72,
    resolved: true,
    resolution: "Reseated the approved dock cable. The external monitor stayed on after a restart.",
  },
];

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

function requireData(data, message) {
  if (data) return data;
  throw new Error(message);
}

async function findUserId(admin, email) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
  return null;
}

async function ensurePerson(admin, person) {
  let userId = await findUserId(admin, person.email);
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: person.email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        full_name: person.fullName,
        employee_id: person.employeeId,
        department: person.department,
        job_title: person.jobTitle,
      },
    });
    if (error) throw new Error(`${person.email}: ${error.message}`);
    userId = data.user.id;
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        full_name: person.fullName,
        employee_id: person.employeeId,
        department: person.department,
        job_title: person.jobTitle,
      },
    });
    if (error) throw new Error(`${person.email}: ${error.message}`);
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      email: person.email,
      full_name: person.fullName,
      employee_id: person.employeeId,
      department: person.department,
      job_title: person.jobTitle,
      is_active: true,
    },
    { onConflict: "id" },
  );
  if (profileError) throw new Error(profileError.message);

  const { error: roleError } = await admin.from("user_roles").upsert(
    person.roles.map((role) => ({ user_id: userId, role })),
    { onConflict: "user_id,role" },
  );
  if (roleError) throw new Error(roleError.message);

  return userId;
}

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error("Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to server/.env before seeding.");
  }
  if (demoPassword.length < 8) {
    throw new Error("SEED_DEMO_PASSWORD must be at least 8 characters.");
  }

  const admin = createSupabaseAdmin();
  const { data: teams, error: teamError } = await admin.from("support_teams").select("id, code");
  if (teamError) throw new Error(teamError.message);
  if (!teams?.length) {
    throw new Error("No support teams found. Run the three SQL migrations in the Supabase SQL Editor first.");
  }

  const teamByCode = new Map(teams.map((team) => [team.code, team.id]));
  const ids = new Map();
  for (const person of people) {
    ids.set(person.email, await ensurePerson(admin, person));
    console.log(`Account ready: ${person.email}`);
  }

  const managerId = ids.get("divya.krishnan@demo.college");
  const { error: managerError } = await admin
    .from("support_teams")
    .update({ manager_id: managerId })
    .in("code", [...teamByCode.keys()]);
  if (managerError) throw new Error(managerError.message);

  for (const person of people) {
    for (const teamCode of person.teams ?? []) {
      const teamId = teamByCode.get(teamCode);
      if (!teamId) throw new Error(`Missing team ${teamCode}.`);
      const { error } = await admin.from("support_team_members").upsert(
        {
          team_id: teamId,
          user_id: ids.get(person.email),
          is_available: true,
          max_active_tickets: 8,
        },
        { onConflict: "team_id,user_id" },
      );
      if (error) throw new Error(error.message);
    }
  }

  const deviceIds = new Map();
  for (const device of devices) {
    const { data, error } = await admin
      .from("technical_devices")
      .upsert(
        {
          device_identifier: device.deviceIdentifier,
          device_type: device.deviceType,
          manufacturer: device.manufacturer,
          model: device.model,
          operating_system: device.operatingSystem,
          assigned_user_id: ids.get(device.ownerEmail),
          department: device.department,
          status: device.status,
          warranty_until: device.warrantyUntil,
        },
        { onConflict: "device_identifier" },
      )
      .select("id, device_identifier")
      .single();
    if (error) throw new Error(error.message);
    deviceIds.set(data.device_identifier, data.id);
  }

  const { data: policies, error: policyError } = await admin
    .from("support_sla_policies")
    .select("priority, first_response_minutes, resolution_minutes");
  if (policyError) throw new Error(policyError.message);
  const slaByPriority = new Map((policies ?? []).map((policy) => [policy.priority, policy]));

  for (const incident of incidents) {
    assertCategory(incident.category);
    const { data: existing, error: existingError } = await admin
      .from("tickets")
      .select("id, ticket_number")
      .eq("idempotency_key", incident.idempotencyKey)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) {
      console.log(`Ticket already present: ${existing.ticket_number}`);
      continue;
    }

    const { data: ticketNumber, error: numberError } = await admin.rpc("next_ticket_number");
    if (numberError) throw new Error(numberError.message);

    const createdAt = hoursAgo(incident.hoursAgo);
    const sla = slaByPriority.get(incident.priority);
    const executiveId = incident.executiveEmail ? ids.get(incident.executiveEmail) : null;
    const teamId = requireData(teamByCode.get(incident.teamCode), `Missing team ${incident.teamCode}.`);
    const creatorId = requireData(ids.get(incident.creatorEmail), `Missing creator ${incident.creatorEmail}.`);

    const { data: ticket, error: ticketError } = await admin
      .from("tickets")
      .insert({
        ticket_number: ticketNumber,
        creator_id: creatorId,
        title: incident.title,
        description: incident.description,
        original_report: incident.originalReport,
        ai_summary: null,
        category: incident.category,
        subcategory: incident.subcategory,
        priority: incident.priority,
        status: incident.status,
        device_id: incident.deviceIdentifier ? deviceIds.get(incident.deviceIdentifier) : null,
        device_label: incident.deviceIdentifier,
        error_details: incident.errorDetails,
        business_impact: incident.businessImpact,
        affected_users_count: incident.affectedUsers,
        troubleshooting_history: incident.troubleshooting,
        assigned_team_id: teamId,
        assigned_executive_id: executiveId,
        idempotency_key: incident.idempotencyKey,
        first_response_at: executiveId ? addMinutes(createdAt, 25) : null,
        resolved_at: incident.resolved ? addMinutes(createdAt, 180) : null,
        resolution_details: incident.resolution ?? null,
        sla_first_response_due_at: sla ? addMinutes(createdAt, sla.first_response_minutes) : null,
        sla_resolution_due_at: sla ? addMinutes(createdAt, sla.resolution_minutes) : null,
        created_at: createdAt.toISOString(),
      })
      .select("id, ticket_number")
      .single();
    if (ticketError) throw new Error(ticketError.message);

    const { error: historyError } = await admin.from("ticket_status_history").insert({
      ticket_id: ticket.id,
      from_status: null,
      to_status: incident.status,
      changed_by: executiveId ?? managerId,
      reason: "Demonstration incident loaded with its current status.",
      created_at: createdAt.toISOString(),
    });
    if (historyError) throw new Error(historyError.message);

    const { error: assignmentError } = await admin.from("ticket_assignments").insert({
      ticket_id: ticket.id,
      team_id: teamId,
      executive_id: executiveId,
      assigned_by: managerId,
      reason: executiveId
        ? "Demonstration assignment to an available executive."
        : "Demonstration queue assignment because no executive was selected.",
      created_at: createdAt.toISOString(),
    });
    if (assignmentError) throw new Error(assignmentError.message);

    if (incident.escalation) {
      const { error } = await admin.from("ticket_escalations").insert({
        ticket_id: ticket.id,
        from_team_id: teamByCode.get(incident.escalation.fromTeam),
        to_team_id: teamByCode.get(incident.escalation.toTeam),
        from_level: incident.escalation.fromLevel,
        to_level: incident.escalation.toLevel,
        reason: incident.escalation.reason,
        escalated_by: managerId,
        created_at: addMinutes(createdAt, 15),
      });
      if (error) throw new Error(error.message);
    }

    if (incident.diagnostic) {
      const { error } = await admin.from("ticket_diagnostics").insert({
        ticket_id: ticket.id,
        source: "user",
        visibility: "shared",
        details: incident.diagnostic,
        created_by: creatorId,
        created_at: createdAt.toISOString(),
      });
      if (error) throw new Error(error.message);
    }

    for (const message of incident.messages ?? []) {
      const { error } = await admin.from("ticket_conversations").insert({
        ticket_id: ticket.id,
        sender_id: ids.get(message.senderEmail),
        body: message.body,
        is_internal: message.internal,
        created_at: addMinutes(createdAt, 30),
      });
      if (error) throw new Error(error.message);
    }

    const notifications = [
      {
        recipient_id: creatorId,
        type: "ticket.created",
        title: `${ticket.ticket_number} was created`,
        body: incident.title,
      },
    ];
    if (executiveId) {
      notifications.push({
        recipient_id: executiveId,
        type: "ticket.assigned",
        title: `${ticket.ticket_number} is assigned to you`,
        body: incident.title,
      });
    }
    const { error: notificationError } = await admin.from("notifications").insert(
      notifications.map((notification) => ({
        ...notification,
        ticket_id: ticket.id,
        created_at: createdAt.toISOString(),
      })),
    );
    if (notificationError) throw new Error(notificationError.message);
    console.log(`Ticket created: ${ticket.ticket_number}`);
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_id: managerId,
    action: "seed.demo_data",
    entity_type: "system",
    metadata: { source: "server/scripts/seed.js" },
  });
  if (auditError) throw new Error(auditError.message);

  console.log("");
  console.log("Demo accounts are ready. Every account uses the same classroom password:");
  console.log(demoPassword);
  console.log("Sign in as divya.krishnan@demo.college to administer roles.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
