const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register'];

export class SessionExpiredError extends Error {
  constructor(message = 'Session expired') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function handleSessionExpired() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('token');
  window.dispatchEvent(new Event('auth:session-expired'));

  const { pathname, search } = window.location;
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) return;

  const returnTo = encodeURIComponent(`${pathname}${search}`);
  window.location.replace(`/login?expired=1&returnTo=${returnTo}`);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = data.error || `Request failed (${res.status})`;
    const isPublicAuthRequest = PUBLIC_AUTH_PATHS.some((publicPath) => path.startsWith(publicPath));

    if (res.status === 401 && token && !isPublicAuthRequest) {
      handleSessionExpired();
      throw new SessionExpiredError(message);
    }

    throw new Error(message);
  }

  return res.json();
}

export const api = {
  auth: {
    register: (data: {
      name: string;
      email: string;
      password: string;
      inviteToken?: string;
      organizationName?: string;
    }) =>
      request<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<{ user: User }>('/auth/me'),
    verifyInvite: (token: string) =>
      request<{ invitation: InvitationPreview }>(`/auth/invite/${token}`),
  },
  leads: {
    assignableUsers: () => request<{ users: TeamMember[] }>('/leads/assignable-users'),
    list: (params?: { status?: string; search?: string }) => {
      const filtered = Object.fromEntries(
        Object.entries(params || {}).filter(([, v]) => v != null && v !== '')
      );
      const query = new URLSearchParams(filtered).toString();
      return request<{ leads: Lead[] }>(`/leads${query ? `?${query}` : ''}`);
    },
    stats: () => request<{ stats: LeadStats }>('/leads/stats'),
    get: (id: number) => request<{ lead: Lead }>(`/leads/${id}`),
    create: (data: Partial<Lead> & { assignedUserIds?: number[] }) =>
      request<{ lead: Lead }>('/leads', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Lead> & { assignedUserIds?: number[] }) =>
      request<{ lead: Lead }>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ message: string }>(`/leads/${id}`, { method: 'DELETE' }),
    import: (leads: CsvLeadImport[]) =>
      request<{ imported: number; merged: number; failed: number; skipped: number; errors: string[] }>('/leads/import', {
        method: 'POST',
        body: JSON.stringify({ leads }),
      }),
  },
  ai: {
    generate: (leadId: number, type: MessageType, customInstructions?: string) =>
      request<{ content: string; type: string; leadId: number; demo?: boolean; demoReason?: string; provider?: string }>(
        '/ai/generate',
        { method: 'POST', body: JSON.stringify({ leadId, type, customInstructions }) }
      ),
    templates: (leadId?: number) => {
      const query = leadId ? `?leadId=${leadId}` : '';
      return request<{ templates: AITemplate[] }>(`/ai/templates${query}`);
    },
  },
  emails: {
    list: (leadId?: number) => {
      const query = leadId ? `?leadId=${leadId}` : '';
      return request<{ schedules: EmailSchedule[] }>(`/emails${query}`);
    },
    schedule: (data: {
      leadId: number;
      subject: string;
      body: string;
      delayHours?: number;
      scheduledAt?: string;
    }) =>
      request<{ schedule: EmailSchedule }>('/emails/schedule', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    send: (data: { leadId: number; subject: string; body: string }) =>
      request<{ schedule: EmailSchedule }>('/emails/send', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (id: number) =>
      request<{ schedule: EmailSchedule }>(`/emails/${id}`, { method: 'DELETE' }),
    replies: (leadId?: number) => {
      const query = leadId ? `?leadId=${leadId}` : '';
      return request<{ replies: EmailReply[] }>(`/emails/replies${query}`);
    },
  },
  profile: {
    get: () => request<{ profile: UserProfile }>('/profile'),
    update: (data: Partial<UserProfile>) =>
      request<{ profile: UserProfile }>('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  members: {
    list: () => request<{ members: TeamMember[] }>('/members'),
    listInvitations: () => request<{ invitations: Invitation[] }>('/members/invitations'),
    invite: (data: { email: string; role: UserRole }) =>
      request<{ invitation: Invitation & { email_sent?: boolean; demo?: boolean; email_message?: string } }>(
        '/members/invitations',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),
    cancelInvitation: (id: number) =>
      request<{ message: string }>(`/members/invitations/${id}`, { method: 'DELETE' }),
    resendInvitation: (id: number) =>
      request<{ invitation: Invitation & { email_sent?: boolean; demo?: boolean; email_message?: string } }>(
        `/members/invitations/${id}/resend`,
        { method: 'POST' }
      ),
    updateRole: (id: number, role: UserRole) =>
      request<{ member: TeamMember }>(`/members/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    remove: (id: number) =>
      request<{ message: string }>(`/members/${id}`, { method: 'DELETE' }),
  },
  activities: {
    create: (data: {
      leadId?: number;
      activityType: ActivityType;
      description: string;
      metadata?: Record<string, unknown>;
    }) =>
      request<{ activity: Activity }>('/activities', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    forLead: (leadId: number) =>
      request<{ activities: Activity[] }>(`/activities/lead/${leadId}`),
    forOrganization: () =>
      request<{ activities: Activity[] }>('/activities/organization'),
  },
  notes: {
    list: (leadId: number) => request<{ notes: LeadNote[] }>(`/notes/lead/${leadId}`),
    create: (data: { leadId: number; note: string }) =>
      request<{ note: LeadNote }>('/notes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, note: string) =>
      request<{ note: LeadNote }>(`/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ note }),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/notes/${id}`, { method: 'DELETE' }),
  },
  billing: {
    plans: () =>
      request<{ plans: PlanInfo[]; stripe_configured: boolean }>('/billing/plans'),
    subscription: () =>
      request<{ billing: OrganizationBilling }>('/billing/subscription'),
    usage: () => request<{ usage: UsageSummary }>('/billing/usage'),
    checkout: (plan: PaidPlanId) =>
      request<{ url: string; session_id: string }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      }),
    portal: () =>
      request<{ url: string }>('/billing/portal', { method: 'POST' }),
    cancel: () =>
      request<{ billing: OrganizationBilling; message: string }>('/billing/cancel', {
        method: 'POST',
      }),
    resume: () =>
      request<{ billing: OrganizationBilling; message: string }>('/billing/resume', {
        method: 'POST',
      }),
  },
  sequences: {
    list: () => request<{ sequences: FollowUpSequence[] }>('/sequences'),
    create: (data: {
      name: string;
      is_active?: boolean;
      steps: FollowUpStepInput[];
    }) =>
      request<{ sequence: FollowUpSequence }>('/sequences', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: number,
      data: Partial<{ name: string; is_active: boolean; steps: FollowUpStepInput[] }>
    ) =>
      request<{ sequence: FollowUpSequence }>(`/sequences/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<{ message: string }>(`/sequences/${id}`, { method: 'DELETE' }),
  },
};

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  organization_id: number | null;
  organization_name?: string | null;
}

export type UserRole = 'super_admin' | 'admin' | 'user';

export type PlanId = 'free' | 'pro' | 'agency';
export type PaidPlanId = 'pro' | 'agency';

export interface PlanLimits {
  ai_requests: number;
  leads: number;
  emails: number;
  team_members: number;
  storage_mb: number;
}

export interface PlanInfo {
  id: PlanId;
  name: string;
  description: string;
  price_monthly: number;
  limits: PlanLimits;
  features: string[];
  stripe_price_configured: boolean;
}

export interface OrganizationBilling {
  organization_id: number;
  organization_name: string;
  plan: PlanId;
  plan_name: string;
  price_monthly: number;
  limits: PlanLimits;
  features: string[];
  stripe_configured: boolean;
  subscription: {
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    has_stripe_subscription: boolean;
  };
}

export interface UsageMetric {
  used: number;
  limit: number;
}

export interface UsageSummary {
  plan: PlanId;
  period_start: string;
  usage: {
    ai_requests: UsageMetric;
    emails: UsageMetric;
    leads: UsageMetric;
    team_members: UsageMetric;
    storage_mb: UsageMetric;
  };
}

export interface UserProfile extends User {
  company_name?: string | null;
  job_title?: string | null;
  phone?: string | null;
  calendar_url?: string | null;
  services_description?: string | null;
}

export interface Lead {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  source: string;
  status: LeadStatus;
  notes?: string;
  team_member_name?: string;
  created_at: string;
  updated_at: string;
  assignees?: LeadAssignee[];
}

export interface CsvLeadImport {
  name: string;
  email: string;
  phone?: string;
  source?: string;
  status?: LeadStatus;
  notes?: string;
  team_member?: string;
}

export interface LeadAssignee {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type MessageType = 'follow_up' | 'sales' | 're_engagement';

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
}

export interface AITemplate {
  id: number;
  user_id: number;
  lead_id: number;
  type: MessageType;
  content: string;
  created_at: string;
}

export interface EmailSchedule {
  id: number;
  user_id: number;
  lead_id: number;
  subject: string;
  body: string;
  scheduled_at: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string;
  error_message?: string;
  lead_name?: string;
  lead_email?: string;
  from_email?: string;
}

export interface EmailReply {
  id: number;
  organization_id: number;
  lead_id: number;
  from_email: string;
  from_name?: string;
  subject: string;
  body_text: string;
  body_html?: string;
  message_id?: string;
  received_at: string;
  source: string;
  created_at: string;
  lead_name?: string;
  lead_email?: string;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface InvitationPreview {
  email: string;
  role: UserRole;
  organization_name: string;
}

export interface Invitation {
  id: number;
  email: string;
  role: UserRole;
  token?: string;
  status?: string;
  expires_at: string;
  created_at?: string;
  invited_by_name?: string;
  invite_link: string;
}

export type ActivityType =
  | 'lead_created'
  | 'lead_updated'
  | 'lead_deleted'
  | 'lead_assigned'
  | 'lead_status_changed'
  | 'ai_message_generated'
  | 'ai_template_used'
  | 'email_scheduled'
  | 'email_sent'
  | 'email_failed'
  | 'email_cancelled'
  | 'note_added'
  | 'note_updated'
  | 'note_deleted'
  | 'follow_up_scheduled'
  | 'email_received';

export interface Activity {
  id: number;
  organization_id: number;
  lead_id: number | null;
  user_id: number;
  activity_type: ActivityType;
  description: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
  lead_name?: string;
}

export interface LeadNote {
  id: number;
  lead_id: number;
  user_id: number;
  note: string;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_email?: string;
}

export interface FollowUpStep {
  id: number;
  sequence_id: number;
  step_number: number;
  delay_hours: number;
  subject: string;
  message_template: string;
}

export interface FollowUpStepInput {
  step_number?: number;
  delay_hours: number;
  subject: string;
  message_template: string;
}

export interface FollowUpSequence {
  id: number;
  organization_id: number;
  name: string;
  is_active: number | boolean;
  created_at: string;
  steps: FollowUpStep[];
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  lead_created: 'Lead Created',
  lead_updated: 'Lead Updated',
  lead_deleted: 'Lead Deleted',
  lead_assigned: 'Lead Assigned',
  lead_status_changed: 'Status Changed',
  ai_message_generated: 'AI Message Generated',
  ai_template_used: 'AI Template Used',
  email_scheduled: 'Email Scheduled',
  email_sent: 'Email Sent',
  email_failed: 'Email Failed',
  email_cancelled: 'Email Cancelled',
  note_added: 'Note Added',
  note_updated: 'Note Updated',
  note_deleted: 'Note Deleted',
  follow_up_scheduled: 'Follow-Up Scheduled',
  email_received: 'Reply Received',
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  lead_created: '👤',
  lead_updated: '✏️',
  lead_deleted: '🗑️',
  lead_assigned: '📌',
  lead_status_changed: '🔄',
  ai_message_generated: '✨',
  ai_template_used: '📝',
  email_scheduled: '⏰',
  email_sent: '✉️',
  email_failed: '❌',
  email_cancelled: '🚫',
  note_added: '📋',
  note_updated: '📋',
  note_deleted: '📋',
  follow_up_scheduled: '🔁',
  email_received: '📩',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'User',
};

export function canManageMembers(role?: UserRole) {
  return role === 'super_admin' || role === 'admin';
}
