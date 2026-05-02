// Contracts for the Efi IA assistant.

export type AiMessageRole = 'user' | 'model';

export interface AiMessage {
  role: AiMessageRole;
  text: string;
}

export interface AiChatRequest {
  // Full conversation history. Server is stateless — client owns the transcript.
  messages: AiMessage[];
}

// Names the assistant can return so the client can refresh the affected slice
// of state without re-fetching the whole bootstrap.
export type AiMutationKind =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'partner.created'
  | 'partner.updated'
  | 'contact.created'
  | 'contact.updated'
  | 'template.created';

export interface AiMutation {
  kind: AiMutationKind;
  // Human-readable Spanish summary, surfaced as a toast in the UI.
  summary: string;
}

export interface AiChatResponse {
  reply: string;
  mutations: AiMutation[];
  quota: AiQuota;
  // Contextual follow-up chips. Empty when conversation feels closed.
  suggestions: string[];
}

export interface AiQuota {
  used: number;
  limit: number;
  // ISO date when the current period ends (first of next UTC month).
  resetsAt: string;
}

export interface AiQuotaResponse extends AiQuota {}

// Error codes returned by /api/v1/ai/chat that the client surfaces specially.
export type AiErrorCode =
  | 'ai_disabled'      // GEMINI_API_KEY not configured
  | 'quota_exhausted'  // user hit monthly limit
  | 'upstream_error';  // Gemini call failed
