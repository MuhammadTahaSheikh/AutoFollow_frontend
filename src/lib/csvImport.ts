import { LeadStatus } from './api';

export interface CsvLeadRow {
  name: string;
  email: string;
  phone?: string;
  source?: string;
  status?: LeadStatus;
  notes?: string;
  team_member?: string;
}

export interface CsvParseResult {
  leads: CsvLeadRow[];
  errors: string[];
}

const VALID_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const HEADER_MAP: Record<string, keyof CsvLeadRow> = {
  name: 'name',
  'full name': 'name',
  fullname: 'name',
  'contact name': 'name',
  contact: 'name',
  lead: 'name',
  'lead name': 'name',
  company: 'name',
  'company name': 'name',
  employer: 'name',
  business: 'name',
  title: 'name',
  email: 'email',
  'e-mail': 'email',
  'email address': 'email',
  mail: 'email',
  phone: 'phone',
  mobile: 'phone',
  tel: 'phone',
  telephone: 'phone',
  source: 'source',
  url: 'source',
  link: 'source',
  website: 'source',
  status: 'status',
  notes: 'notes',
  note: 'notes',
  'team member': 'team_member',
  team_member: 'team_member',
  teammember: 'team_member',
  member: 'team_member',
  'assigned to': 'team_member',
  assigned: 'team_member',
  assignee: 'team_member',
  assignees: 'team_member',
  owner: 'team_member',
  'team owner': 'team_member',
  rep: 'team_member',
  'sales rep': 'team_member',
};

function detectDelimiter(line: string): ',' | '\t' | ';' {
  let comma = 0;
  let tab = 0;
  let semi = 0;
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === ',') comma++;
      else if (ch === '\t') tab++;
      else if (ch === ';') semi++;
    }
  }

  if (tab > comma && tab > 0) return '\t';
  if (semi > comma && semi > 0) return ';';
  return ',';
}

function parseCsvLine(line: string, delimiter: ',' | '\t' | ';'): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsv(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => parseCsvLine(line, delimiter));
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function extractEmails(value: string): string[] {
  const matches = value.match(EMAIL_PATTERN);
  if (!matches) return [];
  return Array.from(new Set(matches.map((email) => email.trim().toLowerCase())));
}

function isPlaceholderEmail(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'form filled' ||
    normalized === 'form fill' ||
    normalized === 'n/a' ||
    normalized === 'na' ||
    normalized === 'none' ||
    normalized === '-'
  );
}

function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0] || email;
  const cleaned = local.replace(/[._+-]+/g, ' ').trim();
  if (!cleaned) return email;
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function isWeakName(name?: string): boolean {
  if (!name) return true;
  const normalized = name.trim().toLowerCase();
  return (
    normalized === 'not given' ||
    normalized === 'n/a' ||
    normalized === 'na' ||
    normalized === 'unknown' ||
    normalized === '-'
  );
}

function isUrl(value?: string): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function pickName(...candidates: (string | undefined)[]): string {
  for (const candidate of candidates) {
    if (candidate && !isWeakName(candidate)) return candidate.trim();
  }
  for (const candidate of candidates) {
    if (candidate?.trim()) return candidate.trim();
  }
  return '';
}

function pickSource(current?: string, incoming?: string): string | undefined {
  if (isUrl(incoming) && !isUrl(current)) return incoming;
  if (isUrl(current)) return current;
  return incoming || current;
}

function appendNote(existing: string | undefined, addition: string | undefined): string | undefined {
  const next = (addition || '').trim();
  if (!next) return existing;
  if (!existing?.trim()) return next;
  if (existing.includes(next)) return existing;
  return `${existing.trim()}\n${next}`;
}

function buildJobNote(jobTitle?: string, source?: string, remarks?: string, projectPrice?: string): string | undefined {
  const parts: string[] = [];
  if (jobTitle?.trim()) parts.push(`Job: ${jobTitle.trim()}`);
  if (source?.trim()) parts.push(`URL: ${source.trim()}`);
  if (remarks?.trim()) parts.push(`Remarks: ${remarks.trim()}`);
  if (projectPrice?.trim()) parts.push(`Price: ${projectPrice.trim()}`);
  return parts.length > 0 ? parts.join(' | ') : undefined;
}

function mergeLeadRows(existing: CsvLeadRow, incoming: CsvLeadRow): CsvLeadRow {
  return {
    name: pickName(existing.name, incoming.name) || existing.name || incoming.name,
    email: existing.email,
    phone: existing.phone || incoming.phone,
    source: pickSource(existing.source, incoming.source) || 'csv',
    status: existing.status || incoming.status || 'new',
    notes: appendNote(existing.notes, incoming.notes),
    team_member: existing.team_member || incoming.team_member,
  };
}

export function parseLeadsCsv(text: string): CsvParseResult {
  const rows = parseCsv(text);
  const errors: string[] = [];
  const leads: CsvLeadRow[] = [];

  if (rows.length < 2) {
    return { leads: [], errors: ['CSV must include a header row and at least one data row.'] };
  }

  const [headerRow, ...dataRows] = rows;
  const normalizedHeaders = headerRow.map((header) => normalizeHeader(header));
  const columnMap: (keyof CsvLeadRow | null)[] = normalizedHeaders.map((header) => {
    const key = HEADER_MAP[header];
    return key || null;
  });
  const jobTitleColIndex = normalizedHeaders.indexOf('job title');
  const remarksColIndex = normalizedHeaders.indexOf('remarks');
  const projectPriceColIndex = normalizedHeaders.indexOf('project price');

  if (!columnMap.includes('email')) {
    return {
      leads: [],
      errors: ['CSV must include an "email" column.'],
    };
  }

  const leadsByEmail = new Map<string, CsvLeadRow>();

  dataRows.forEach((row, index) => {
    const rowNum = index + 2;
    const lead: Partial<CsvLeadRow> = {};

    columnMap.forEach((field, colIndex) => {
      if (!field) return;
      const value = (row[colIndex] || '').trim();
      if (value) {
        lead[field] = value as never;
      }
    });

    const jobTitle =
      jobTitleColIndex >= 0 ? (row[jobTitleColIndex] || '').trim() : '';
    const remarks = remarksColIndex >= 0 ? (row[remarksColIndex] || '').trim() : '';
    const projectPrice =
      projectPriceColIndex >= 0 ? (row[projectPriceColIndex] || '').trim() : '';

    const displayName = pickName(lead.name, jobTitle);
    const rowNotes = buildJobNote(jobTitle, lead.source, remarks, projectPrice);

    const rawEmail = lead.email || '';
    const emails = extractEmails(rawEmail);
    if (emails.length === 0) {
      if (rawEmail && isPlaceholderEmail(rawEmail)) {
        errors.push(`Row ${rowNum}: no valid email (placeholder "${rawEmail}").`);
        return;
      }
      if (!displayName && !rawEmail) {
        return;
      }
      errors.push(`Row ${rowNum}: email is required.`);
      return;
    }

    if (lead.status && !VALID_STATUSES.includes(lead.status)) {
      errors.push(`Row ${rowNum}: invalid status "${lead.status}".`);
      return;
    }

    emails.forEach((email) => {
      const resolvedName = displayName || deriveNameFromEmail(email);
      const incoming: CsvLeadRow = {
        name: resolvedName,
        email,
        phone: lead.phone,
        source: lead.source || 'csv',
        status: lead.status || 'new',
        notes: rowNotes,
        team_member: lead.team_member,
      };

      const existing = leadsByEmail.get(email);
      leadsByEmail.set(email, existing ? mergeLeadRows(existing, incoming) : incoming);
    });
  });

  leads.push(...Array.from(leadsByEmail.values()));

  if (leads.length === 0 && errors.length === 0) {
    errors.push('No valid lead rows found in the CSV.');
  }

  return { leads, errors };
}

export const CSV_IMPORT_TEMPLATE = `name,email,phone,source,status,team member,notes
Jane Doe,jane@example.com,555-0100,website,new,Jane User,Interested in demo
John Smith,john@example.com,,referral,new,,
`;
