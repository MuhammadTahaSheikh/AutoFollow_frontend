const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
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
    throw new Error(data.error || `Request failed (${res.status})`);
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
  created_at: string;
  updated_at: string;
  assignees?: LeadAssignee[];
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
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string;
  error_message?: string;
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

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'User',
};

export function canManageMembers(role?: UserRole) {
  return role === 'super_admin' || role === 'admin';
}
