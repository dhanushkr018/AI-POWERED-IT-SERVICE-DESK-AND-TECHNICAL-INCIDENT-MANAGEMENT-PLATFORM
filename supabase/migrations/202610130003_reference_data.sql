-- Reference data that does not depend on user accounts.
-- Demo people, devices, and tickets are loaded later by `npm run seed`.
-- Run this after the schema and access-control migrations.

insert into public.support_teams (name, code, support_level, description)
values
  ('L1 Service Desk', 'L1_SERVICE_DESK', 'L1', 'First contact for common technical incidents.'),
  ('Endpoint Support', 'ENDPOINT', 'L1', 'Laptops, desktops, operating systems, and approved peripherals.'),
  ('Network Support', 'NETWORK', 'L1', 'Campus network, Wi-Fi, and VPN connectivity.'),
  ('L2 Support', 'L2_SUPPORT', 'L2', 'Incidents that remain unresolved after first-line troubleshooting.'),
  ('L3 Support', 'L3_SUPPORT', 'L3', 'Complex specialist incidents that need senior technical support.'),
  ('Security Response', 'SECURITY', 'SECURITY', 'Suspected account compromise, phishing, and security incidents.'),
  ('Priority Incident Queue', 'PRIORITY_QUEUE', 'PRIORITY', 'Critical incidents that affect many people or a core service.')
on conflict (code) do nothing;

insert into public.support_sla_policies (priority, first_response_minutes, resolution_minutes)
values
  ('P1', 15, 240),
  ('P2', 60, 480),
  ('P3', 240, 4320),
  ('P4', 1440, 7200)
on conflict (priority) do nothing;

insert into public.support_knowledge_articles (
  title, category, symptoms, error_messages, steps, escalation_conditions, status, author_name, updated_at
) values
(
  'Laptop does not power on',
  'endpoint',
  array['No power light', 'Black screen', 'Fan does not start'],
  array['No error is displayed'],
  $steps$[
    {"step": 1, "text": "Connect the approved power adapter to a wall outlet you know works."},
    {"step": 2, "text": "Look at the charging indicator and write down whether it turns on."},
    {"step": 3, "text": "Hold the power button for 10 seconds, release it, then press it once."},
    {"step": 4, "text": "If a message, beep, or blink pattern appears, write it down exactly."}
  ]$steps$::jsonb,
  'Request a support executive if there is still no power indicator, if you smell burning, or if the problem continues. Do not open the computer case.',
  'published',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
),
(
  'VPN connects and then drops',
  'network',
  array['VPN welcome message appears', 'Connection drops within a minute', 'Public websites still open'],
  array['Connection reset by gateway'],
  $steps$[
    {"step": 1, "text": "Check whether ordinary websites open while the VPN is disconnected."},
    {"step": 2, "text": "Write down the exact VPN error. Do not include a password or MFA code."},
    {"step": 3, "text": "Disconnect, close the VPN client, open it again, and try once."},
    {"step": 4, "text": "If you are on a personal hotspot, try the approved office or campus network."}
  ]$steps$::jsonb,
  'If normal internet works and the approved VPN still fails, Network Support should take the incident.',
  'published',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
),
(
  'Wi-Fi is connected but work sites do not open',
  'network',
  array['Wi-Fi shows connected', 'Work sites do not load', 'Coworkers may or may not be affected'],
  array[]::text[],
  $steps$[
    {"step": 1, "text": "Confirm the network name is the approved office or campus network."},
    {"step": 2, "text": "Try one public website and one work site, and note which one fails."},
    {"step": 3, "text": "Disconnect from Wi-Fi and connect again once."},
    {"step": 4, "text": "Do not change proxy, certificate, or security settings yourself."}
  ]$steps$::jsonb,
  'Ask for Network Support if work sites stay unavailable or several people are affected.',
  'published',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
),
(
  'An application closes unexpectedly',
  'application',
  array['The application closes', 'The failure can be repeated', 'An error message may appear'],
  array[]::text[],
  $steps$[
    {"step": 1, "text": "Write down the application name and the exact error text."},
    {"step": 2, "text": "Note whether it fails every time or only sometimes."},
    {"step": 3, "text": "Save your work in other applications, then open the affected application once more."},
    {"step": 4, "text": "If coworkers using the same application are also affected, say so in the report."}
  ]$steps$::jsonb,
  'Request support when the application keeps closing or the error mentions a missing licence or account.',
  'published',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
),
(
  'A work application will not open',
  'enterprise_application',
  array['The approved work application does not start', 'A shortcut opens and then closes'],
  array[]::text[],
  $steps$[
    {"step": 1, "text": "Use the approved shortcut or company portal. Do not install a personal copy."},
    {"step": 2, "text": "Write down the application name and any error text."},
    {"step": 3, "text": "Restart the computer once if you can save your other work."},
    {"step": 4, "text": "Ask a nearby coworker whether the same approved application opens for them."}
  ]$steps$::jsonb,
  'If the approved application still does not open, create a ticket instead of changing security settings.',
  'published',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
),
(
  'The computer is slow',
  'endpoint',
  array['Applications take a long time to open', 'The whole computer feels slow', 'The problem may have started recently'],
  array[]::text[],
  $steps$[
    {"step": 1, "text": "Note whether one application is slow or the whole computer is slow."},
    {"step": 2, "text": "Note the day the slowness started and what changed, if you know."},
    {"step": 3, "text": "Save your work and restart the computer once."},
    {"step": 4, "text": "Leave endpoint protection enabled. Do not install cleaner or tuning software."}
  ]$steps$::jsonb,
  'Ask for Endpoint Support if the computer is still slow after a restart or if it suddenly became unusable.',
  'published',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
),
(
  'Windows update is stuck or the computer restarts repeatedly',
  'operating_system',
  array['Update progress does not move', 'The computer returns to the same update screen'],
  array['Working on updates'],
  $steps$[
    {"step": 1, "text": "Write down the percentage or message on the screen."},
    {"step": 2, "text": "Leave the computer connected to power."},
    {"step": 3, "text": "If it has been on the same message for more than an hour, request support before turning it off again."},
    {"step": 4, "text": "Do not run repair commands from a website and do not delete system files."}
  ]$steps$::jsonb,
  'Endpoint Support should take over when an update loop continues or the computer cannot reach the sign-in screen.',
  'published',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
),
(
  'Cannot sign in to a work account',
  'login_access',
  array['The password is rejected', 'The account is locked', 'The sign-in page shows an unfamiliar message'],
  array['Account locked'],
  $steps$[
    {"step": 1, "text": "Confirm you are using your work email address and check whether Caps Lock is on."},
    {"step": 2, "text": "Use the approved password-reset or account-unlock page for your organization."},
    {"step": 3, "text": "Never share a password, MFA code, recovery code, or private key with the assistant or a support executive."},
    {"step": 4, "text": "If the account is locked or the message looks unfamiliar, stop and ask for a person."}
  ]$steps$::jsonb,
  'A person must help when the account is locked, MFA is unavailable, or the sign-in page may be fraudulent.',
  'published',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
),
(
  'Monitor, printer, or docking station is not detected',
  'peripheral',
  array['No display on an external monitor', 'Printer is missing', 'Dock does not charge or connect'],
  array[]::text[],
  $steps$[
    {"step": 1, "text": "Identify the device as a monitor, printer, or docking station and note its location."},
    {"step": 2, "text": "Check that the approved cable is seated and that the device has power."},
    {"step": 3, "text": "If you use a dock, connect the display or network cable directly once to see whether the dock is the problem."},
    {"step": 4, "text": "Do not install drivers from an unknown website."}
  ]$steps$::jsonb,
  'Request Endpoint Support when a direct connection works but the dock does not, or when no connection works.',
  'published',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
),
(
  'A required work setting no longer connects',
  'configuration',
  array['An approved application cannot reach its service', 'A setting changed recently'],
  array[]::text[],
  $steps$[
    {"step": 1, "text": "Write down which application or service fails and the exact message."},
    {"step": 2, "text": "Note any change you remember, such as a new network or a new computer."},
    {"step": 3, "text": "Do not edit proxy, firewall, certificate, or endpoint-protection settings."},
    {"step": 4, "text": "Try the connection once more and record the time it failed."}
  ]$steps$::jsonb,
  'Support should change approved settings. The reporter should not apply administrative fixes.',
  'published',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
),
(
  'Report a suspected security incident',
  'security',
  array['Unexpected sign-in warning', 'Suspicious email', 'Request for a password or MFA code'],
  array[]::text[],
  $steps$[
    {"step": 1, "text": "Do not click links, open attachments, or reply to the suspicious message."},
    {"step": 2, "text": "Do not forward the message to coworkers."},
    {"step": 3, "text": "Write down the sender address and the time you noticed it."},
    {"step": 4, "text": "Tell a support executive. Do not investigate another person's account yourself."}
  ]$steps$::jsonb,
  'Security Response takes every suspected phishing, malware, or account-compromise report.',
  'published',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
),
(
  'Draft: internal escalation worksheet',
  'security',
  array['Internal draft'],
  array[]::text[],
  $steps$[
    {"step": 1, "text": "This draft is for administrators only and is not approved guidance."}
  ]$steps$::jsonb,
  'Do not publish this worksheet until it has been reviewed.',
  'draft',
  'IT Knowledge Team',
  '2026-10-01T00:00:00Z'
)
on conflict (title) do nothing;
