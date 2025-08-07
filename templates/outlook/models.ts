import { z } from "zod";

export const OptionalBackfillSetting = z.object({
  backfillPeriodMs: z.number()
});

export type OptionalBackfillSetting = z.infer<typeof OptionalBackfillSetting>;

export const Attachments = z.object({
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  attachmentId: z.string()
});

export type Attachments = z.infer<typeof Attachments>;

export const OutlookEmail = z.object({
  id: z.string(),
  sender: z.string().optional(),
  recipients: z.string().optional(),
  date: z.string(),
  subject: z.string(),
  body: z.string(),
  attachments: Attachments.array(),
  threadId: z.string()
});

export type OutlookEmail = z.infer<typeof OutlookEmail>;

export const DocumentInput = z.object({
  threadId: z.string(),
  attachmentId: z.string()
});

export type DocumentInput = z.infer<typeof DocumentInput>;

export const EmailAddress = z.object({
  address: z.string(),
  name: z.string()
});

export type EmailAddress = z.infer<typeof EmailAddress>;

export const OutlookCalendar = z.object({
  id: z.string(),
  allowedOnlineMeetingProviders: z.string().array(),
  canEdit: z.boolean(),
  canShare: z.boolean(),
  canViewPrivateItems: z.boolean(),
  changeKey: z.string(),

  color: z.union([
    z.literal("auto"),
    z.literal("lightBlue"),
    z.literal("lightGreen"),
    z.literal("lightOrange"),
    z.literal("lightGray"),
    z.literal("lightYellow"),
    z.literal("lightTeal"),
    z.literal("lightPink"),
    z.literal("lightBrown"),
    z.literal("lightRed"),
    z.literal("maxColor")
  ]),

  defaultOnlineMeetingProvider: z.string(),
  hexColor: z.string(),
  isDefaultCalendar: z.boolean(),
  isRemovable: z.boolean(),
  isTallyingResponses: z.boolean(),
  name: z.string(),
  owner: EmailAddress
});

export type OutlookCalendar = z.infer<typeof OutlookCalendar>;

export const TimeSlot = z.object({
  dateTime: z.string(),
  timeZone: z.string()
});

export type TimeSlot = z.infer<typeof TimeSlot>;

export const Attendee = z.object({
  emailAddress: EmailAddress,

  proposedNewTime: z.object({
    start: TimeSlot,
    end: TimeSlot
  }).optional(),

  status: z.object({
    response: z.union([
      z.literal("none"),
      z.literal("organizer"),
      z.literal("tentativelyAccepted"),
      z.literal("accepted"),
      z.literal("declined"),
      z.literal("notResponded")
    ]),

    sentDateTime: z.string()
  }),

  type: z.union([z.literal("required"), z.literal("optional"), z.literal("resource")])
});

export type Attendee = z.infer<typeof Attendee>;

export const Location = z.object({
  address: z.object({
    city: z.string().optional(),
    countryOrRegion: z.string().optional(),
    postalCode: z.string().optional(),
    state: z.string().optional(),
    street: z.string().optional()
  }).optional(),

  coordinates: z.object({
    accuracy: z.number().optional(),
    altitude: z.number().optional(),
    altitudeAccuracy: z.number().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }).optional(),

  displayName: z.string().optional(),
  locationEmailAddress: z.string().optional(),
  locationUri: z.string().optional(),

  locationType: z.union([
    z.literal("default"),
    z.literal("conferenceRoom"),
    z.literal("homeAddress"),
    z.literal("businessAddress"),
    z.literal("geoCoordinates"),
    z.literal("streetAddress"),
    z.literal("hotel"),
    z.literal("restaurant"),
    z.literal("localBusiness"),
    z.literal("postalAddress")
  ]).optional(),

  uniqueId: z.string().optional(),
  uniqueIdType: z.string().optional()
});

export type Location = z.infer<typeof Location>;

export const OnlineMeetingInfo = z.object({
  conferenceId: z.string().optional(),
  joinUrl: z.string().optional(),

  phones: z.array(z.object({
    number: z.string(),

    type: z.union([
      z.literal("home"),
      z.literal("business"),
      z.literal("mobile"),
      z.literal("other"),
      z.literal("assistant"),
      z.literal("homeFax"),
      z.literal("businessFax"),
      z.literal("otherFax"),
      z.literal("pager"),
      z.literal("radio")
    ])
  })),

  quickDial: z.string().optional(),
  tollFreeNumbers: z.string().array(),
  tollNumber: z.string().optional()
});

export type OnlineMeetingInfo = z.infer<typeof OnlineMeetingInfo>;

export const PatternedRecurrence = z.object({
  pattern: z.object({
    dayOfMonth: z.number().optional(),
    daysOfWeek: z.string().array().optional(),
    firstDayOfWeek: z.string().optional(),

    index: z.union([
      z.literal("first"),
      z.literal("second"),
      z.literal("third"),
      z.literal("fourth"),
      z.literal("last")
    ]).optional(),

    interval: z.number(),
    month: z.number().optional(),

    type: z.union([
      z.literal("daily"),
      z.literal("weekly"),
      z.literal("absoluteMonthly"),
      z.literal("relativeMonthly"),
      z.literal("absoluteYearly"),
      z.literal("relativeYearly")
    ])
  }).optional(),

  range: z.object({
    endDate: z.string().optional(),
    numberOfOccurrences: z.number().optional(),
    recurrenceTimeZone: z.string().optional(),
    startDate: z.string(),
    type: z.union([z.literal("endDate"), z.literal("noEnd"), z.literal("numbered")])
  })
});

export type PatternedRecurrence = z.infer<typeof PatternedRecurrence>;

export const OutlookCalendarEvent = z.object({
  id: z.string(),
  attendees: Attendee.array(),

  bodyPreview: z.string(),

  end: z.object({
    dateTime: z.string(),
    timeZone: z.string()
  }),

  importance: z.union([z.literal("low"), z.literal("normal"), z.literal("high")]),
  isAllDay: z.boolean(),
  isCancelled: z.boolean(),
  isOrganizer: z.boolean(),
  location: Location,
  onlineMeeting: z.union([OnlineMeetingInfo, z.null()]),
  onlineMeetingProvider: z.string(),

  organizer: z.object({
    emailAddress: EmailAddress
  }),

  recurrence: z.union([PatternedRecurrence, z.null()]),
  responseRequested: z.boolean(),

  responseStatus: z.object({
    response: z.string(),
    time: z.string()
  }),

  sensitivity: z.union([
    z.literal("normal"),
    z.literal("personal"),
    z.literal("private"),
    z.literal("confidential")
  ]),

  start: z.object({
    dateTime: z.string(),
    timeZone: z.string()
  }),

  subject: z.string(),
  webLink: z.string()
});

export type OutlookCalendarEvent = z.infer<typeof OutlookCalendarEvent>;

export const BodyContent = z.object({
  content: z.string(),
  contentType: z.union([z.literal("text"), z.literal("html")])
});

export const IdEntity = z.object({
    id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export type BodyContent = z.infer<typeof BodyContent>;

export const OutlookFolder = z.object({
  id: z.string(),
  displayName: z.string(),
  parentFolderId: z.string(),
  childFolderCount: z.number(),
  unreadItemCount: z.number(),
  totalItemCount: z.number(),
  isHidden: z.boolean()
});

export type OutlookFolder = z.infer<typeof OutlookFolder>;
export const Anonymous_outlook_action_fetchattachment_output = z.string();
export type Anonymous_outlook_action_fetchattachment_output = z.infer<typeof Anonymous_outlook_action_fetchattachment_output>;

export const models = {
  OptionalBackfillSetting: OptionalBackfillSetting,
  Attachments: Attachments,
  OutlookEmail: OutlookEmail,
  DocumentInput: DocumentInput,
  EmailAddress: EmailAddress,
  OutlookCalendar: OutlookCalendar,
  TimeSlot: TimeSlot,
  Attendee: Attendee,
  Location: Location,
  OnlineMeetingInfo: OnlineMeetingInfo,
  PatternedRecurrence: PatternedRecurrence,
  OutlookCalendarEvent: OutlookCalendarEvent,
  OutlookFolder: OutlookFolder,
  Anonymous_outlook_action_fetchattachment_output: Anonymous_outlook_action_fetchattachment_output
};
