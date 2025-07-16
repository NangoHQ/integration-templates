import { z } from "zod";

export const CalendarMetadata = z.object({
  calendarsToSync: z.string().optional().array(),
  singleEvents: z.boolean().optional()
});

export type CalendarMetadata = z.infer<typeof CalendarMetadata>;

export const CalendarSetting = z.object({
  kind: z.string(),
  etag: z.string(),
  id: z.string(),
  value: z.string()
});

export type CalendarSetting = z.infer<typeof CalendarSetting>;

export const SettingsResponse = z.object({
  settings: CalendarSetting.array()
});

export type SettingsResponse = z.infer<typeof SettingsResponse>;

export const UserInformation = z.object({
  id: z.string(),
  email: z.string()
});

export type UserInformation = z.infer<typeof UserInformation>;

export const GoogleCalendar = z.object({
  kind: z.string(),
  etag: z.string(),
  id: z.string(),
  summary: z.string(),
  description: z.string(),
  location: z.string(),
  timeZone: z.string(),
  summaryOverride: z.string(),
  colorId: z.string(),
  backgroundColor: z.string(),
  foregroundColor: z.string(),
  hidden: z.boolean(),
  selected: z.boolean(),
  accessRole: z.string(),

  defaultReminders: z.array(z.object({
    method: z.string(),
    minutes: z.number()
  })),

  notificationSettings: z.object({
    notifications: z.array(z.object({
      type: z.string(),
      method: z.string()
    }))
  }),

  primary: z.boolean(),
  deleted: z.boolean(),

  conferenceProperties: z.object({
    allowedConferenceSolutionTypes: z.array(z.string())
  })
});

export type GoogleCalendar = z.infer<typeof GoogleCalendar>;

export const CalendarUser = z.object({
  id: z.string().optional(),
  email: z.string().optional(),
  displayName: z.string().optional(),
  self: z.boolean().optional()
});

export type CalendarUser = z.infer<typeof CalendarUser>;

export const EventDateTime = z.object({
  date: z.string().optional(),
  dateTime: z.string().optional(),
  timeZone: z.string().optional()
});

export type EventDateTime = z.infer<typeof EventDateTime>;

export const GoogleCalendarEvent = z.object({
  kind: z.string(),
  etag: z.string(),
  id: z.string(),
  status: z.string(),
  htmlLink: z.string(),
  created: z.string(),
  updated: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  colorId: z.string().optional(),
  creator: CalendarUser,
  organizer: CalendarUser,
  start: EventDateTime,
  end: EventDateTime,
  endTimeUnspecified: z.boolean().optional(),
  recurrence: z.string().optional().array(),
  recurringEventId: z.string().optional(),
  originalStartTime: EventDateTime,
  transparency: z.string().optional(),
  visibility: z.string().optional(),
  iCalUID: z.string().optional(),
  sequence: z.number().optional(),

  attendees: z.array(z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    displayName: z.string().optional(),
    organizer: z.boolean().optional(),
    self: z.boolean().optional(),
    resource: z.boolean().optional(),
    optional: z.boolean().optional(),
    responseStatus: z.string().optional(),
    comment: z.string().optional(),
    additionalGuests: z.number().optional()
  })).optional(),

  attendeesOmitted: z.boolean().optional(),

  extendedProperties: z.object({
    "private": z.object({}).catchall(z.string()).optional(),
    shared: z.object({}).catchall(z.string()).optional()
  }).optional(),

  hangoutLink: z.string().optional(),

  conferenceData: z.object({
    createRequest: z.object({
      requestId: z.string(),

      conferenceSolutionKey: z.object({
        type: z.string()
      }),

      status: z.object({
        statusCode: z.string()
      })
    }).optional(),

    entryPoints: z.array(z.object({
      entryPointType: z.string(),
      uri: z.string().optional(),
      label: z.string().optional(),
      pin: z.string().optional(),
      accessCode: z.string().optional(),
      meetingCode: z.string().optional(),
      passcode: z.string().optional(),
      password: z.string().optional(),
      regionCode: z.string().optional()
    })).optional(),

    conferenceSolution: z.object({
      key: z.object({
        type: z.string()
      }),

      name: z.string(),
      iconUri: z.string()
    }).optional(),

    conferenceId: z.string().optional(),
    signature: z.string().optional(),
    notes: z.string().optional(),

    parameters: z.object({
      addOnParameters: z.object({
        parameters: z.object({}).catchall(z.string()).optional()
      }).optional()
    }).optional()
  }).optional(),

  gadget: z.object({
    type: z.string().optional(),
    title: z.string().optional(),
    link: z.string().optional(),
    iconLink: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    display: z.string().optional(),
    preferences: z.object({}).catchall(z.string()).optional()
  }).optional(),

  anyoneCanAddSelf: z.boolean().optional(),
  guestsCanInviteOthers: z.boolean().optional(),
  guestsCanModify: z.boolean().optional(),
  guestsCanSeeOtherGuests: z.boolean().optional(),
  privateCopy: z.boolean().optional(),
  locked: z.boolean().optional(),

  reminders: z.object({
    useDefault: z.boolean(),

    overrides: z.array(z.object({
      method: z.string(),
      minutes: z.number()
    })).optional()
  }).optional(),

  outOfOfficeProperties: z.object({
    autoDeclineMode: z.string().optional(),
    declineMessage: z.string().optional()
  }).optional(),

  source: z.object({
    url: z.string().optional(),
    title: z.string().optional()
  }).optional(),

  workingLocationProperties: z.object({
    type: z.string(),
    homeOffice: z.any().optional(),

    customLocation: z.object({
      label: z.string().optional()
    }).optional(),

    officeLocation: z.object({
      buildingId: z.string().optional(),
      floorId: z.string().optional(),
      floorSectionId: z.string().optional(),
      deskId: z.string().optional(),
      label: z.string().optional()
    }).optional()
  }).optional(),

  attachments: z.array(z.object({
    fileUrl: z.string(),
    title: z.string().optional(),
    mimeType: z.string().optional(),
    iconLink: z.string().optional(),
    fileId: z.string().optional()
  })).optional(),

  eventType: z.string().optional()
});

export type GoogleCalendarEvent = z.infer<typeof GoogleCalendarEvent>;

export const models = {
  CalendarMetadata: CalendarMetadata,
  CalendarSetting: CalendarSetting,
  SettingsResponse: SettingsResponse,
  UserInformation: UserInformation,
  GoogleCalendar: GoogleCalendar,
  CalendarUser: CalendarUser,
  EventDateTime: EventDateTime,
  GoogleCalendarEvent: GoogleCalendarEvent
};