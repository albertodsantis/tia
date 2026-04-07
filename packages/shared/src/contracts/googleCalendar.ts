export interface CalendarTaskPayload {
  title: string;
  description: string;
  partnerName: string;
  dueDate: string;
  gcalEventId?: string;
}

export interface CalendarSyncRequest {
  task: CalendarTaskPayload;
}

export interface CalendarSyncResponse {
  success: boolean;
  eventId?: string | null;
}

export interface CalendarSyncDownRequest {
  eventIds: string[];
}

export interface CalendarSyncDownResponse {
  success: boolean;
  updatedEvents: Array<{
    eventId: string;
    dueDate: string;
  }>;
}

export interface CalendarStatusResponse {
  connected: boolean;
}
