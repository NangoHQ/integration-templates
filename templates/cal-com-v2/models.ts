import { z } from "zod";

export const EventType = z.object({
  id: z.string(),
  teamId: z.union([z.null(), z.number()]),
  schedulingType: z.union([z.null(), z.string()]),
  userId: z.number(),
  metadata: z.object({}).catchall(z.any()),
  description: z.union([z.string(), z.null()]),
  hidden: z.boolean(),
  slug: z.string(),
  length: z.number(),
  title: z.string(),
  requiresConfirmation: z.boolean(),
  position: z.number(),
  offsetStart: z.number(),
  profileId: z.union([z.string(), z.null()]),
  eventName: z.union([z.string(), z.null()]),
  parentId: z.union([z.number(), z.null()]),
  timeZone: z.union([z.string(), z.null()]),
  periodType: z.string(),
  periodStartDate: z.union([z.string(), z.null()]),
  periodEndDate: z.union([z.string(), z.null()]),
  periodDays: z.union([z.number(), z.null()]),
  periodCountCalendarDays: z.union([z.number(), z.null()]),
  lockTimeZoneToggleOnBookingPage: z.boolean(),
  requiresBookerEmailVerification: z.boolean(),
  disableGuests: z.boolean(),
  hideCalendarNotes: z.boolean(),
  minimumBookingNotice: z.number(),
  beforeEventBuffer: z.number(),
  afterEventBuffer: z.number(),
  seatsPerTimeSlot: z.union([z.number(), z.null()]),
  onlyShowFirstAvailableSlot: z.boolean(),
  seatsShowAttendees: z.boolean(),
  seatsShowAvailabilityCount: z.boolean(),
  scheduleId: z.union([z.number(), z.null()]),
  price: z.number(),
  currency: z.string(),
  slotInterval: z.union([z.number(), z.null()]),
  successRedirectUrl: z.union([z.string(), z.null()]),
  isInstantEvent: z.boolean(),
  aiPhoneCallConfig: z.union([z.string(), z.null()]),
  assignAllTeamMembers: z.boolean(),
  recurringEvent: z.union([z.boolean(), z.null()]),

  locations: z.array(z.object({
    type: z.string()
  })),

  bookingFields: z.union([z.string(), z.null()]),
  useEventTypeDestinationCalendarEmail: z.boolean(),
  secondaryEmailId: z.union([z.string(), z.null()]),
  bookingLimits: z.union([z.boolean(), z.null()]),
  durationLimits: z.union([z.boolean(), z.null()]),
  hashedLink: z.union([z.string(), z.null()]),
  children: z.array(z.object({}).catchall(z.any())),
  hosts: z.array(z.object({}).catchall(z.any())),
  userIds: z.number().array()
});

export type EventType = z.infer<typeof EventType>;

export const User = z.object({
  username: z.string(),
  name: z.string(),
  weekStart: z.string(),
  organizationId: z.number(),
  avatarUrl: z.string(),

  profile: z.object({
    username: z.string(),
    id: z.number(),
    userId: z.number(),
    uid: z.string(),
    name: z.string(),
    organizationId: z.number(),

    organization: z.object({
      id: z.number(),
      slug: z.string(),
      name: z.string(),
      metadata: z.object({}).catchall(z.any())
    }),

    upId: z.string(),
    image: z.string(),
    brandColor: z.string(),
    darkBrandColor: z.string(),
    theme: z.string(),
    bookerLayouts: z.object({}).catchall(z.any())
  }),

  bookerUrl: z.string()
});

export type User = z.infer<typeof User>;

export const Attendee = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  timeZone: z.string(),
  locale: z.string(),
  bookingId: z.number()
});

export type Attendee = z.infer<typeof Attendee>;

export const Event = z.object({
  id: z.string(),
  title: z.string(),
  userPrimaryEmail: z.string(),
  description: z.string(),
  customInputs: z.object({}).catchall(z.any()),
  startTime: z.string(),
  endTime: z.string(),
  attendees: Attendee.array(),
  metadata: z.object({}).catchall(z.any()),
  uid: z.string(),
  recurringEventId: z.string(),
  location: z.string(),

  eventType: z.object({
    slug: z.string(),
    id: z.number(),
    eventName: z.string(),
    price: z.number(),
    recurringEvent: z.object({}).catchall(z.any()),
    currency: z.string(),
    metadata: z.object({}).catchall(z.any()),
    seatsShowAttendees: z.object({}).catchall(z.any()),
    seatsShowAvailabilityCount: z.object({}).catchall(z.any()),
    team: z.object({}).catchall(z.any())
  }),

  status: z.object({}).catchall(z.any()),
  paid: z.boolean(),
  payment: z.array(z.object({}).catchall(z.any())),

  references: z.array(z.object({
    id: z.number(),
    type: z.string(),
    uid: z.string(),
    meetingId: z.string(),
    thirdPartyRecurringEventId: z.string(),
    meetingPassword: z.string(),
    meetingUrl: z.string(),
    bookingId: z.number(),
    externalCalendarId: z.string(),
    deleted: z.object({}).catchall(z.string()),
    credentialId: z.number()
  })),

  isRecorded: z.boolean(),
  seatsReferences: z.array(z.object({}).catchall(z.any())),
  user: User,
  rescheduled: z.object({}).catchall(z.any())
});

export type Event = z.infer<typeof Event>;

export const models = {
  EventType: EventType,
  User: User,
  Attendee: Attendee,
  Event: Event
};