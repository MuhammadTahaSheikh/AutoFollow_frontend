import { EmailReply, EmailSchedule } from './api';

export interface EmailThread {
  schedule: EmailSchedule | null;
  replies: EmailReply[];
  label: string;
  latestAt: number;
}

export interface LeadConversation {
  leadId: number;
  leadName: string;
  leadEmail: string;
  threads: EmailThread[];
  latestAt: number;
  replyCount: number;
}

export function normalizeSubject(subject: string): string {
  let normalized = subject.trim();
  let previous = '';

  while (normalized !== previous) {
    previous = normalized;
    normalized = normalized.replace(/^(re|fwd|fw):\s*/i, '').trim();
  }

  return normalized.toLowerCase();
}

export function stripQuotedReplyText(text: string): string {
  if (!text?.trim()) return '';

  let cleaned = text.replace(/\r\n/g, '\n');
  cleaned = cleaned.split(/\nOn .+ wrote:\s*\n?/i)[0];
  cleaned = cleaned.split(/\nFrom: .+\nSent:/i)[0];
  cleaned = cleaned.replace(/\n>+[\s\S]*/, '');

  return cleaned.trim();
}

function getScheduleTime(schedule: EmailSchedule): number {
  const value = schedule.sent_at || schedule.scheduled_at;
  return new Date(value).getTime();
}

function matchReplyToSchedule(reply: EmailReply, schedule: EmailSchedule): boolean {
  if (reply.lead_id !== schedule.lead_id) return false;

  const replySubject = normalizeSubject(reply.subject);
  const scheduleSubject = normalizeSubject(schedule.subject);

  if (!replySubject || !scheduleSubject) return false;
  if (replySubject === scheduleSubject) return true;

  return (
    replySubject.includes(scheduleSubject) ||
    scheduleSubject.includes(replySubject)
  );
}

export function buildLeadConversations(
  schedules: EmailSchedule[],
  replies: EmailReply[]
): LeadConversation[] {
  const conversations = new Map<number, LeadConversation>();

  const ensureConversation = (leadId: number, leadName = '', leadEmail = '') => {
    if (!conversations.has(leadId)) {
      conversations.set(leadId, {
        leadId,
        leadName,
        leadEmail,
        threads: [],
        latestAt: 0,
        replyCount: 0,
      });
    }
    const conversation = conversations.get(leadId)!;
    if (leadName) conversation.leadName = leadName;
    if (leadEmail) conversation.leadEmail = leadEmail;
    return conversation;
  };

  for (const schedule of schedules) {
    const conversation = ensureConversation(
      schedule.lead_id,
      schedule.lead_name,
      schedule.lead_email
    );
    conversation.threads.push({
      schedule,
      replies: [],
      label: schedule.subject,
      latestAt: getScheduleTime(schedule),
    });
  }

  const unmatchedReplies: EmailReply[] = [];

  for (const reply of replies) {
    const conversation = ensureConversation(
      reply.lead_id,
      reply.lead_name,
      reply.lead_email
    );

    const matchingThread = conversation.threads.find(
      (thread) => thread.schedule && matchReplyToSchedule(reply, thread.schedule)
    );

    if (matchingThread) {
      matchingThread.replies.push(reply);
      conversation.replyCount++;
      const replyTime = new Date(reply.received_at).getTime();
      matchingThread.latestAt = Math.max(matchingThread.latestAt, replyTime);
      continue;
    }

    unmatchedReplies.push(reply);
  }

  for (const reply of unmatchedReplies) {
    const conversation = conversations.get(reply.lead_id)!;
    const replyTime = new Date(reply.received_at).getTime();
    const orphanLabel = normalizeSubject(reply.subject) || 'Inbound reply';

    let orphanThread = conversation.threads.find((thread) => !thread.schedule);
    if (!orphanThread) {
      orphanThread = {
        schedule: null,
        replies: [],
        label: orphanLabel,
        latestAt: replyTime,
      };
      conversation.threads.push(orphanThread);
    }

    orphanThread.replies.push(reply);
    orphanThread.latestAt = Math.max(orphanThread.latestAt, replyTime);
    conversation.replyCount++;
  }

  const conversationList = Array.from(conversations.values());

  for (const conversation of conversationList) {
    for (const thread of conversation.threads) {
      thread.replies.sort(
        (a: EmailReply, b: EmailReply) =>
          new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
      );
    }

    conversation.threads.sort((a: EmailThread, b: EmailThread) => b.latestAt - a.latestAt);
    conversation.latestAt = Math.max(
      ...conversation.threads.map((thread: EmailThread) => thread.latestAt),
      0
    );
  }

  return conversationList
    .filter((conversation) => conversation.threads.length > 0)
    .sort((a: LeadConversation, b: LeadConversation) => b.latestAt - a.latestAt);
}
