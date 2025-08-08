import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string()
});

export type User = z.infer<typeof User>;

export const CreateUser = z.object({
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const UserInformation = z.object({
  id: z.string(),
  email: z.string()
});

export type UserInformation = z.infer<typeof UserInformation>;

export const EventLocation = z.object({
  type: z.string().optional(),
  location: z.union([z.string(), z.null()]).optional(),
  join_url: z.union([z.string(), z.null()]).optional(),
  status: z.union([z.string(), z.null()]).optional(),
  additional_info: z.union([z.string(), z.null()]).optional()
});

export type EventLocation = z.infer<typeof EventLocation>;

export const InviteesCounter = z.object({
  total: z.number(),
  active: z.number(),
  limit: z.number()
});

export type InviteesCounter = z.infer<typeof InviteesCounter>;

export const EventMembership = z.object({
  user: z.string(),
  user_email: z.union([z.string(), z.null()]),
  user_name: z.string(),
  buffered_end_time: z.string().optional(),
  buffered_start_time: z.string().optional()
});

export type EventMembership = z.infer<typeof EventMembership>;

export const EventGuest = z.object({
  email: z.string(),
  created_at: z.string(),
  updated_at: z.string()
});

export type EventGuest = z.infer<typeof EventGuest>;

export const CalendarEvent = z.object({
  kind: z.string(),
  external_id: z.string()
});

export type CalendarEvent = z.infer<typeof CalendarEvent>;

export const EventCancellation = z.object({
  canceled_by: z.string(),
  reason: z.union([z.string(), z.null()]),
  canceler_type: z.string(),
  created_at: z.string()
});

export type EventCancellation = z.infer<typeof EventCancellation>;

export const Event = z.object({
  id: z.string(),
  uri: z.string(),
  name: z.union([z.string(), z.null()]),
  meeting_notes_plain: z.union([z.string(), z.null()]),
  meeting_notes_html: z.union([z.string(), z.null()]),
  status: z.union([z.literal("active"), z.literal("canceled")]),
  start_time: z.string(),
  end_time: z.string(),
  event_type: z.string(),
  location: EventLocation,
  invitees_counter: InviteesCounter,
  created_at: z.string(),
  updated_at: z.string(),
  event_memberships: EventMembership.array(),
  event_guests: EventGuest.array(),
  calendar_event: z.union([CalendarEvent, z.null()]),
  cancellation: EventCancellation
});

export type Event = z.infer<typeof Event>;

export const EventTypeLocation = z.object({
  kind: z.string(),
  phone_number: z.union([z.number(), z.null()]).optional(),
  additional_info: z.union([z.string(), z.null()]).optional()
});

export type EventTypeLocation = z.infer<typeof EventTypeLocation>;

export const EventQuestion = z.object({
  name: z.string(),
  type: z.string(),
  position: z.number(),
  enabled: z.boolean(),
  required: z.boolean(),
  answer_choices: z.string().array(),
  include_other: z.boolean()
});

export type EventQuestion = z.infer<typeof EventQuestion>;

export const EventProfile = z.object({
  type: z.string(),
  name: z.string(),
  owner: z.string()
});

export type EventProfile = z.infer<typeof EventProfile>;

export const EventType = z.object({
  id: z.string(),
  uri: z.string(),
  name: z.union([z.string(), z.null()]),
  active: z.boolean(),
  booking_method: z.string(),
  slug: z.union([z.string(), z.null()]),
  scheduling_url: z.string(),
  duration: z.number(),
  duration_options: z.union([z.number().array(), z.null()]),
  kind: z.string(),
  pooling_type: z.union([z.string(), z.null()]),
  type: z.string(),
  color: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  internal_note: z.union([z.string(), z.null()]),
  description_plain: z.union([z.string(), z.null()]),
  description_html: z.union([z.string(), z.null()]),
  profile: z.union([EventProfile, z.null()]),
  secret: z.boolean(),
  deleted_at: z.union([z.string(), z.null()]),
  admin_managed: z.boolean(),
  locations: z.union([EventTypeLocation.array(), z.null()]),
  custom_questions: EventQuestion.array(),
  position: z.number()
});

export type EventType = z.infer<typeof EventType>;

export const QuestionAndAnswer = z.object({
  answer: z.string(),
  position: z.number(),
  question: z.string()
});

export type QuestionAndAnswer = z.infer<typeof QuestionAndAnswer>;

export const Tracking = z.object({
  utm_campaign: z.union([z.string(), z.null()]),
  utm_source: z.union([z.string(), z.null()]),
  utm_medium: z.union([z.string(), z.null()]),
  utm_content: z.union([z.string(), z.null()]),
  utm_term: z.union([z.string(), z.null()]),
  salesforce_uuid: z.union([z.string(), z.null()])
});

export type Tracking = z.infer<typeof Tracking>;

export const Payment = z.object({
  external_id: z.string(),
  provider: z.string(),
  amount: z.number(),
  currency: z.string(),
  terms: z.string(),
  successful: z.boolean()
});

export type Payment = z.infer<typeof Payment>;

export const Reconfirmation = z.object({
  created_at: z.string(),
  confirmed_at: z.string()
});

export type Reconfirmation = z.infer<typeof Reconfirmation>;

export const EventInvitee = z.object({
  id: z.string(),
  cancel_url: z.string(),
  created_at: z.string(),
  email: z.string(),
  event: z.string(),
  name: z.string(),
  first_name: z.union([z.string(), z.null()]),
  last_name: z.union([z.string(), z.null()]),
  new_invitee: z.union([z.string(), z.null()]),
  old_invitee: z.union([z.string(), z.null()]),
  questions_and_answers: QuestionAndAnswer.array(),
  reschedule_url: z.string(),
  rescheduled: z.boolean(),
  status: z.string(),
  text_reminder_number: z.union([z.string(), z.null()]),
  timezone: z.string(),
  tracking: Tracking,
  updated_at: z.string(),
  uri: z.string(),
  cancellation: EventCancellation,
  routing_form_submission: z.union([z.string(), z.null()]),
  payment: z.union([Payment, z.null()]),
  no_show: z.union([z.string(), z.null()]),
  reconfirmation: z.union([Reconfirmation, z.null()]),
  scheduling_method: z.union([z.string(), z.null()]),
  invitee_scheduled_by: z.union([z.string(), z.null()])
});

export type EventInvitee = z.infer<typeof EventInvitee>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  User: User,
  CreateUser: CreateUser,
  UserInformation: UserInformation,
  EventLocation: EventLocation,
  InviteesCounter: InviteesCounter,
  EventMembership: EventMembership,
  EventGuest: EventGuest,
  CalendarEvent: CalendarEvent,
  EventCancellation: EventCancellation,
  Event: Event,
  EventTypeLocation: EventTypeLocation,
  EventQuestion: EventQuestion,
  EventProfile: EventProfile,
  EventType: EventType,
  QuestionAndAnswer: QuestionAndAnswer,
  Tracking: Tracking,
  Payment: Payment,
  Reconfirmation: Reconfirmation,
  EventInvitee: EventInvitee
};