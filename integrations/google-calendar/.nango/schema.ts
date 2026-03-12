export interface SyncMetadata_google_calendar_calendarevents {
  /**
   * Array of calendar IDs to sync. Defaults to ["primary"]
   */
  calendarsToSync?: string[] | undefined;
  /**
   * RFC3339 timestamp for lower bound on event start time. Also used as initial sync point if no checkpoint exists.
   */
  timeMin?: string | undefined;
  /**
   * RFC3339 timestamp for upper bound on event end time
   */
  timeMax?: string | undefined;
  /**
   * Whether to expand recurring events into single instances
   */
  singleEvents?: boolean | undefined;
};

export interface CalendarEvent {
  id: string;
  kind?: string | undefined;
  etag?: string | undefined;
  status?: string | undefined;
  htmlLink?: string | undefined;
  created?: string | undefined;
  updated: string;
  summary?: string | undefined;
  description?: string | undefined;
  location?: string | undefined;
  creator?: {  email?: string | undefined;
  displayName?: string | undefined;
  self?: boolean | undefined;};
  organizer?: {  email?: string | undefined;
  displayName?: string | undefined;
  self?: boolean | undefined;};
  start?: {  date?: string | undefined;
  dateTime?: string | undefined;
  timeZone?: string | undefined;};
  end?: {  date?: string | undefined;
  dateTime?: string | undefined;
  timeZone?: string | undefined;};
  recurrence?: string[] | undefined;
  recurringEventId?: string | undefined;
  originalStartTime?: {  date?: string | undefined;
  dateTime?: string | undefined;
  timeZone?: string | undefined;};
  transparency?: string | undefined;
  visibility?: string | undefined;
  iCalUID?: string | undefined;
  sequence?: number | undefined;
  attendees?: ({  email?: string | undefined;
  displayName?: string | undefined;
  responseStatus?: string | undefined;})[];
  attendeesOmitted?: boolean | undefined;
  hangoutLink?: string | undefined;
  conferenceData?: any | undefined;
  reminders?: any | undefined;
  attachments?: any | undefined;
  eventType?: string | undefined;
};

export interface Calendar {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  timeZone: string | null;
  accessRole: string;
  colorId: string | null;
  backgroundColor: string | null;
  foregroundColor: string | null;
  hidden?: boolean | undefined;
  selected: boolean;
  primary?: boolean | undefined;
  deleted?: boolean | undefined;
};

export interface Setting {
  id: string;
  value: string;
  etag?: string | null | undefined;
};

export interface ActionInput_google_calendar_addattendee {
  /**
   * Calendar ID. Use "primary" for the default calendar. Example: "primary"
   */
  calendar_id: string;
  /**
   * Event ID to add attendee to. Example: "abc123xyz"
   */
  event_id: string;
  /**
   * Email address of the attendee to add. Example: "attendee@example.com"
   */
  attendee_email: string;
  /**
   * Display name of the attendee (optional). Example: "John Doe"
   */
  attendee_name?: string | undefined;
  /**
   * Whether the attendee is optional (optional). Default: false
   */
  optional?: boolean | undefined;
  /**
   * Response status of the attendee (optional). Default: "needsAction"
   */
  response_status?: 'needsAction' | 'declined' | 'tentative' | 'accepted' | undefined;
};

export interface ActionOutput_google_calendar_addattendee {
  id: string;
  summary: string | null;
  attendees: ({  email: string;
  displayName: string | null;
  optional?: boolean | undefined;
  responseStatus?: string | undefined;})[];
};

export interface ActionInput_google_calendar_clearcalendar {
};

export interface ActionOutput_google_calendar_clearcalendar {
  /**
   * Number of events deleted
   */
  deleted_count: number;
  /**
   * The calendar ID that was cleared
   */
  calendar_id: string;
};

export interface ActionInput_google_calendar_createaclrule {
  /**
   * Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.
   */
  calendar_id: string;
  /**
   * The role assigned to the scope. Possible values: "none" - Provides no access, "freeBusyReader" - Provides read access to free/busy information, "reader" - Provides read access to the calendar, "writer" - Provides read and write access to the calendar, "owner" - Provides manager access to the calendar.
   */
  role: 'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  /**
   * The type of the scope. Possible values: "default" - The public scope, "user" - Limits the scope to a single user, "group" - Limits the scope to a group, "domain" - Limits the scope to a domain.
   */
  scope_type: 'default' | 'user' | 'group' | 'domain';
  /**
   * The email address of a user or group, or the name of a domain, depending on the scope type. Omitted for type "default".
   */
  scope_value?: string | undefined;
  /**
   * Whether to send notifications about the calendar sharing change. Optional. The default is True.
   */
  send_notifications?: boolean | undefined;
};

export interface ActionOutput_google_calendar_createaclrule {
  /**
   * The identifier of the ACL rule.
   */
  id: string;
  /**
   * ETag of the resource.
   */
  etag: string;
  /**
   * Type of the resource ("calendar#aclRule").
   */
  kind: string;
  /**
   * The role assigned to the scope.
   */
  role: 'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  /**
   * The extent to which calendar access is granted by this ACL rule.
   */
  scope: {  /**
   * The type of the scope.
   */
  type: 'default' | 'user' | 'group' | 'domain';
  /**
   * The email address of a user or group, or the name of a domain.
   */
  value?: string | undefined;};
};

export interface ActionInput_google_calendar_createalldayevent {
  /**
   * Calendar identifier. Use "primary" for the primary calendar.
   */
  calendar_id?: string | undefined;
  /**
   * Title of the event
   */
  summary: string;
  /**
   * Start date in yyyy-mm-dd format (inclusive)
   */
  start_date: string;
  /**
   * End date in yyyy-mm-dd format (exclusive)
   */
  end_date: string;
  /**
   * Description of the event
   */
  description?: string | undefined;
  /**
   * Location of the event
   */
  location?: string | undefined;
};

export interface ActionOutput_google_calendar_createalldayevent {
  id: string;
  summary: string;
  start_date: string;
  end_date: string;
  description: string | null;
  location: string | null;
  html_link: string;
};

export interface ActionInput_google_calendar_createcalendar {
  /**
   * Title of the calendar. Example: "My Work Calendar"
   */
  summary: string;
};

export interface ActionOutput_google_calendar_createcalendar {
  /**
   * Identifier of the calendar.
   */
  id: string;
  /**
   * Title of the calendar.
   */
  summary: string;
  /**
   * Description of the calendar.
   */
  description: string | null;
  /**
   * The time zone of the calendar.
   */
  timeZone: string | null;
  /**
   * Geographic location of the calendar as free-form text.
   */
  location: string | null;
  /**
   * ETag of the resource.
   */
  etag: string;
  /**
   * Type of the resource ("calendar#calendar").
   */
  kind: string;
};

export interface ActionInput_google_calendar_createevent {
  /**
   * Calendar ID to create the event in. Example: "primary" or a calendar ID string
   */
  calendar_id: string;
  /**
   * Event title/summary. Example: "Team Meeting"
   */
  summary: string;
  /**
   * Event description
   */
  description?: string | undefined;
  /**
   * Event location
   */
  location?: string | undefined;
  start: {  /**
   * Start time in ISO 8601 format. Example: "2024-03-15T09:00:00-07:00"
   */
  dateTime: string;
  /**
   * Time zone for the start time. Example: "America/Los_Angeles"
   */
  timeZone?: string | undefined;};
  end: {  /**
   * End time in ISO 8601 format. Example: "2024-03-15T10:00:00-07:00"
   */
  dateTime: string;
  /**
   * Time zone for the end time. Example: "America/Los_Angeles"
   */
  timeZone?: string | undefined;};
  /**
   * List of attendees
   */
  attendees?: ({  /**
   * Email address of the attendee. Example: "attendee@example.com"
   */
  email: string;
  /**
   * Display name of the attendee
   */
  displayName?: string | undefined;
  /**
   * Response status
   */
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted' | undefined;})[];
  /**
   * Event reminders
   */
  reminders?: {  /**
   * Whether to use default reminders
   */
  useDefault?: boolean | undefined;
  /**
   * Custom reminder overrides
   */
  overrides?: ({  /**
   * Method of reminder
   */
  method: 'email' | 'popup';
  /**
   * Minutes before the event to trigger the reminder
   */
  minutes: number;})[] | undefined;};
  /**
   * Recurrence rules (RRULE, EXRULE, RDATE, EXDATE). Example: ["RRULE:FREQ=WEEKLY;BYDAY=MO"]
   */
  recurrence?: string[] | undefined;
};

export interface ActionOutput_google_calendar_createevent {
  /**
   * Event ID
   */
  id: string;
  /**
   * Link to the event in Google Calendar
   */
  htmlLink: string;
  /**
   * Event title/summary
   */
  summary: string;
  /**
   * Event description
   */
  description: string | null;
  /**
   * Event location
   */
  location: string | null;
  start: {  dateTime: string;
  timeZone: string | null;};
  end: {  dateTime: string;
  timeZone: string | null;};
  attendees?: ({  email: string;
  displayName: string | null;
  responseStatus: string;})[] | undefined;
  /**
   * Creation timestamp
   */
  created: string;
  /**
   * Last update timestamp
   */
  updated: string;
};

export interface ActionInput_google_calendar_createrecurringevent {
  /**
   * Calendar ID. Defaults to "primary". Example: "primary"
   */
  calendar_id?: string | undefined;
  /**
   * Event title/summary. Example: "Weekly Team Meeting"
   */
  summary: string;
  /**
   * Event description. Example: "Discuss project progress"
   */
  description?: string | undefined;
  /**
   * Event location. Example: "Conference Room A"
   */
  location?: string | undefined;
  /**
   * Event start time in RFC3339 format. Example: "2024-03-15T09:00:00-07:00"
   */
  start: string;
  /**
   * Event end time in RFC3339 format. Example: "2024-03-15T10:00:00-07:00"
   */
  end: string;
  /**
   * iCalendar RRULE for recurrence. Example: "FREQ=WEEKLY;BYDAY=MO,WE,FR"
   */
  rrule: string;
  /**
   * Timezone for the event. Defaults to "UTC". Example: "America/Los_Angeles"
   */
  timezone?: string | undefined;
};

export interface ActionOutput_google_calendar_createrecurringevent {
  id: string;
  html_link: string;
  summary: string;
  start: string;
  end: string;
  recurrence?: string[] | undefined;
  status: string;
};

export interface ActionInput_google_calendar_deleteaclrule {
  /**
   * Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.
   */
  calendar_id: string;
  /**
   * ACL rule identifier to delete.
   */
  rule_id: string;
};

export interface ActionOutput_google_calendar_deleteaclrule {
  /**
   * Whether the deletion was successful.
   */
  success: boolean;
  /**
   * The calendar ID from the request.
   */
  calendar_id: string;
  /**
   * The ACL rule ID that was deleted.
   */
  rule_id: string;
};

export interface ActionInput_google_calendar_deletecalendar {
  /**
   * Calendar ID to delete. Example: "c_abc123@group.calendar.google.com"
   */
  calendar_id: string;
};

export interface ActionOutput_google_calendar_deletecalendar {
  success: boolean;
  calendar_id: string;
};

export interface ActionInput_google_calendar_deleteevent {
  /**
   * Calendar ID. Example: "primary" or "abc123@group.calendar.google.com"
   */
  calendar_id: string;
  /**
   * Event ID to delete. Example: "tpv6jfth9cbnqhi1f570l45878"
   */
  event_id: string;
};

export interface ActionOutput_google_calendar_deleteevent {
  success: boolean;
  message: string;
};

export interface ActionInput_google_calendar_findfreeslots {
  /**
   * List of calendar IDs to check for free/busy information. Example: ["primary", "work@example.com"]
   */
  calendar_ids: string[];
  /**
   * Start of the time range in RFC3339 format. Example: "2024-03-15T09:00:00Z"
   */
  time_min: string;
  /**
   * End of the time range in RFC3339 format. Example: "2024-03-15T17:00:00Z"
   */
  time_max: string;
  /**
   * Minimum duration in minutes for a free slot to be returned. Example: 30
   */
  duration_minutes: number;
};

export interface ActionOutput_google_calendar_findfreeslots {
  /**
   * List of free time slots meeting the minimum duration
   */
  free_slots: ({  /**
   * Start time of the free slot in RFC3339 format
   */
  start: string;
  /**
   * End time of the free slot in RFC3339 format
   */
  end: string;
  /**
   * Duration of the free slot in minutes
   */
  duration_minutes: number;})[];
  /**
   * Number of calendars checked
   */
  calendars_checked: number;
};

export interface ActionInput_google_calendar_getaclrule {
  /**
   * Calendar identifier. Use "primary" for the primary calendar of the logged-in user.
   */
  calendar_id: string;
  /**
   * ACL rule identifier.
   */
  rule_id: string;
};

export interface ActionOutput_google_calendar_getaclrule {
  /**
   * Identifier of the ACL rule.
   */
  id: string;
  /**
   * ETag of the resource.
   */
  etag: string;
  /**
   * Type of the resource ("calendar#aclRule").
   */
  kind: string;
  /**
   * The role assigned to the scope. Possible values: "none", "freeBusyReader", "reader", "writer", "owner".
   */
  role: string;
  /**
   * The extent to which calendar access is granted by this ACL rule.
   */
  scope: {  /**
   * The type of the scope. Possible values: "default", "user", "group", "domain".
   */
  type: string;
  /**
   * The email address of a user or group, or the name of a domain. Omitted for type "default".
   */
  value?: string | undefined;};
};

export interface ActionInput_google_calendar_getcalendarlistentry {
  /**
   * Calendar identifier. Use "primary" for the primary calendar. Example: "primary" or "abc123@group.calendar.google.com"
   */
  calendar_id: string;
};

export interface ActionOutput_google_calendar_getcalendarlistentry {
  id: string;
  summary: string | null;
  description: string | null;
  access_role: string | null;
  color_id: string | null;
  background_color: string | null;
  foreground_color: string | null;
  primary: boolean;
  selected: boolean;
  time_zone: string | null;
  hidden: boolean;
};

export interface ActionInput_google_calendar_getcalendar {
  /**
   * Calendar identifier. To retrieve calendar IDs call the calendarList.list method. If you want to access the primary calendar of the currently logged in user, use the "primary" keyword.
   */
  calendar_id: string;
};

export interface ActionOutput_google_calendar_getcalendar {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  timeZone: string | null;
  etag: string;
  kind: string;
};

export interface ActionInput_google_calendar_getcolors {
};

export interface ActionOutput_google_calendar_getcolors {
  /**
   * Type of the resource
   */
  kind: string;
  /**
   * Last modification time of the color palette (as a RFC3339 timestamp)
   */
  updated: string;
  /**
   * A global palette of calendar colors, mapping from the color ID to its definition
   */
  calendar: {  [key: string]: {  /**
   * The background color associated with this color definition
   */
  background: string;
  /**
   * The foreground color that can be used to write on top of the background color
   */
  foreground: string;};};
  /**
   * A global palette of event colors, mapping from the color ID to its definition
   */
  event: {  [key: string]: {  /**
   * The background color associated with this color definition
   */
  background: string;
  /**
   * The foreground color that can be used to write on top of the background color
   */
  foreground: string;};};
};

export interface ActionInput_google_calendar_getevent {
  /**
   * Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.
   */
  calendar_id: string;
  /**
   * Event identifier.
   */
  event_id: string;
};

export interface ActionOutput_google_calendar_getevent {
  id: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  status: string | null;
  html_link: string | null;
  created_at: string | null;
  updated_at: string | null;
  start: {  date?: string | null | undefined;
  date_time?: string | null | undefined;
  time_zone?: string | null | undefined;} | null;
  end: {  date?: string | null | undefined;
  date_time?: string | null | undefined;
  time_zone?: string | null | undefined;} | null;
  creator: {  id?: string | null | undefined;
  email?: string | null | undefined;
  display_name?: string | null | undefined;
  self?: boolean | undefined;} | null;
  organizer: {  id?: string | null | undefined;
  email?: string | null | undefined;
  display_name?: string | null | undefined;
  self?: boolean | undefined;} | null;
};

export interface ActionInput_google_calendar_getsetting {
  /**
   * The ID of the user setting. Examples: "timezone", "locale", "dateFieldOrder", "format24HourTime", "weekStart", "autoAddHangouts"
   */
  setting_id: string;
};

export interface ActionOutput_google_calendar_getsetting {
  /**
   * Type of the resource
   */
  kind: string;
  /**
   * ETag of the resource
   */
  etag: string;
  /**
   * The ID of the user setting
   */
  id: string;
  /**
   * Value of the user setting
   */
  value: string;
};

export interface ActionInput_google_calendar_importevent {
  /**
   * Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.
   */
  calendar_id: string;
  /**
   * Event unique identifier as defined in RFC5545. Used to uniquely identify events across calendaring systems.
   */
  i_cal_uid: string;
  /**
   * Title of the event.
   */
  summary?: string | undefined;
  /**
   * Description of the event. Can contain HTML.
   */
  description?: string | undefined;
  /**
   * Geographic location of the event as free-form text.
   */
  location?: string | undefined;
  /**
   * The (inclusive) start time of the event.
   */
  start: {  /**
   * The date, in the format "yyyy-mm-dd", if this is an all-day event.
   */
  date?: string | undefined;
  /**
   * The time, as a combined date-time value (formatted according to RFC3339).
   */
  dateTime?: string | undefined;
  /**
   * The time zone in which the time is specified (IANA Time Zone Database name, e.g. "Europe/Zurich").
   */
  timeZone?: string | undefined;};
  /**
   * The (exclusive) end time of the event.
   */
  end: {  /**
   * The date, in the format "yyyy-mm-dd", if this is an all-day event.
   */
  date?: string | undefined;
  /**
   * The time, as a combined date-time value (formatted according to RFC3339).
   */
  dateTime?: string | undefined;
  /**
   * The time zone in which the time is specified (IANA Time Zone Database name, e.g. "Europe/Zurich").
   */
  timeZone?: string | undefined;};
  /**
   * The attendees of the event.
   */
  attendees?: ({  additionalGuests?: number | undefined;
  comment?: string | undefined;
  displayName?: string | undefined;
  email: string;
  optional?: boolean | undefined;
  resource?: boolean | undefined;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted' | undefined;})[];
  /**
   * The organizer of the event.
   */
  organizer?: {  displayName?: string | undefined;
  email?: string | undefined;};
  /**
   * Version number of conference data supported by the API client.
   */
  conference_data_version?: number | undefined;
  /**
   * Whether API client performing operation supports event attachments.
   */
  supports_attachments?: boolean | undefined;
};

export interface ActionOutput_google_calendar_importevent {
  /**
   * Identifier of the event.
   */
  id: string;
  /**
   * Event unique identifier as defined in RFC5545.
   */
  i_cal_uid: string;
  summary?: string | null | undefined;
  description?: string | null | undefined;
  location?: string | null | undefined;
  status?: 'confirmed' | 'tentative' | 'cancelled' | undefined;
  html_link?: string | null | undefined;
  start?: {  date?: string | undefined;
  dateTime?: string | undefined;
  timeZone?: string | undefined;};
  end?: {  date?: string | undefined;
  dateTime?: string | undefined;
  timeZone?: string | undefined;};
  attendees?: ({  additionalGuests?: number | undefined;
  comment?: string | undefined;
  displayName?: string | undefined;
  email: string;
  optional?: boolean | undefined;
  resource?: boolean | undefined;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted' | undefined;})[];
  organizer?: {  displayName?: string | null | undefined;
  email?: string | null | undefined;};
};

export interface ActionInput_google_calendar_insertcalendartolist {
  /**
   * The ID of the calendar to add to the list. Example: "primary" or a calendar email address
   */
  calendar_id: string;
  /**
   * Whether to use the foregroundColor and backgroundColor fields to write calendar colors (RGB). Optional. Default is false.
   */
  color_rgb_format?: boolean | undefined;
  /**
   * The main color of the calendar in hexadecimal format "#0088aa". Requires colorRgbFormat=true. Optional.
   */
  background_color?: string | undefined;
  /**
   * The foreground color of the calendar in hexadecimal format "#ffffff". Requires colorRgbFormat=true. Optional.
   */
  foreground_color?: string | undefined;
  /**
   * The color ID from the calendar colors definition. Optional.
   */
  color_id?: string | undefined;
  /**
   * Whether the calendar has been hidden from the list. Optional.
   */
  hidden?: boolean | undefined;
  /**
   * Whether the calendar content shows up in the calendar UI. Optional. Default is false.
   */
  selected?: boolean | undefined;
  /**
   * The summary that the authenticated user has set for this calendar. Optional.
   */
  summary_override?: string | undefined;
};

export interface ActionOutput_google_calendar_insertcalendartolist {
  id: string;
  summary?: string | undefined;
  summary_override?: string | undefined;
  description?: string | undefined;
  location?: string | undefined;
  time_zone?: string | undefined;
  access_role?: string | undefined;
  background_color?: string | undefined;
  foreground_color?: string | undefined;
  color_id?: string | undefined;
  hidden?: boolean | undefined;
  selected?: boolean | undefined;
  primary?: boolean | undefined;
};

export interface ActionInput_google_calendar_listaclrules {
  /**
   * Calendar identifier. Use "primary" for the primary calendar.
   */
  calendar_id: string;
  /**
   * Maximum number of entries returned on one result page. Default is 100, max is 250.
   */
  max_results?: number | undefined;
  /**
   * Pagination token from previous response to get the next page.
   */
  cursor?: string | undefined;
  /**
   * Whether to include deleted ACLs (role="none") in the result. Default is false.
   */
  show_deleted?: boolean | undefined;
};

export interface ActionOutput_google_calendar_listaclrules {
  /**
   * List of rules on the access control list
   */
  items: ({  /**
   * Identifier of the ACL rule
   */
  id: string;
  /**
   * ETag of the resource
   */
  etag: string;
  /**
   * Type of the resource ("calendar#aclRule")
   */
  kind: string;
  scope: {  /**
   * The type of the scope ("default", "user", "group", "domain")
   */
  type: string;
  /**
   * The specific email address, group email address, or domain name
   */
  value?: string | undefined;};
  /**
   * The role of the ACL rule ("none", "freeBusyReader", "reader", "writer", "owner")
   */
  role: string;})[];
  /**
   * Token to retrieve the next page of results. Null if no more pages.
   */
  next_cursor: string | null;
  /**
   * Token to retrieve only entries changed since this result was returned.
   */
  next_sync_token?: string | null | undefined;
};

export interface ActionInput_google_calendar_listcalendarlist {
  /**
   * Page token for pagination. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of calendars to return. Default: 100.
   */
  max_results?: number | undefined;
};

export interface ActionOutput_google_calendar_listcalendarlist {
  calendars: ({  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  time_zone: string | null;
  access_role: string | null;
  primary?: boolean | undefined;
  selected?: boolean | undefined;
  background_color: string | null;
  foreground_color: string | null;
  hidden?: boolean | undefined;
  deleted?: boolean | undefined;})[];
  next_cursor: string | null;
};

export interface ActionInput_google_calendar_listeventinstances {
  /**
   * Calendar identifier. Use "primary" for the primary calendar of the logged-in user.
   */
  calendar_id: string;
  /**
   * Recurring event identifier.
   */
  event_id: string;
  /**
   * Maximum number of attendees to include in the response.
   */
  max_attendees?: number | undefined;
  /**
   * Maximum number of events returned on one result page. Default is 250, max is 2500.
   */
  max_results?: number | undefined;
  /**
   * The original start time of the instance in the result.
   */
  original_start?: string | undefined;
  /**
   * Pagination token from a previous response (maps to pageToken).
   */
  cursor?: string | undefined;
  /**
   * Whether to include deleted events in the result. Default is false.
   */
  show_deleted?: boolean | undefined;
  /**
   * Upper bound (exclusive) for an event's start time to filter by. RFC3339 timestamp.
   */
  time_max?: string | undefined;
  /**
   * Lower bound (inclusive) for an event's end time to filter by. RFC3339 timestamp.
   */
  time_min?: string | undefined;
  /**
   * Time zone used in the response. Default is the calendar's time zone.
   */
  time_zone?: string | undefined;
};

export interface ActionOutput_google_calendar_listeventinstances {
  /**
   * List of event instances.
   */
  items: any[];
  /**
   * Pagination token for the next page of results.
   */
  next_cursor: string | null;
  kind?: string | null | undefined;
  etag?: string | null | undefined;
  summary?: string | null | undefined;
  description?: string | null | undefined;
  updated?: string | null | undefined;
  time_zone?: string | null | undefined;
  access_role?: string | null | undefined;
  next_sync_token?: string | null | undefined;
};

export interface ActionInput_google_calendar_listevents {
  /**
   * Calendar identifier. Use "primary" for the primary calendar or a calendar ID from calendarList.list.
   */
  calendar_id?: string | undefined;
  /**
   * Pagination cursor (nextPageToken from previous response). Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of events to return per page (1-2500, default 250).
   */
  max_results?: number | undefined;
  /**
   * Lower bound (exclusive) for an event's end time filter (RFC3339 timestamp).
   */
  time_min?: string | undefined;
  /**
   * Upper bound (exclusive) for an event's start time filter (RFC3339 timestamp).
   */
  time_max?: string | undefined;
  /**
   * Free text search terms to find matching events.
   */
  q?: string | undefined;
  /**
   * Whether to expand recurring events into single instances.
   */
  single_events?: boolean | undefined;
  /**
   * Whether to include cancelled/deleted events.
   */
  show_deleted?: boolean | undefined;
};

export interface ActionOutput_google_calendar_listevents {
  events: ({  id: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  start: {  date: string;} | {  dateTime: string;
  timeZone: string | null;} | null;
  end: {  date: string;} | {  dateTime: string;
  timeZone: string | null;} | null;
  status: string | null;
  created: string | null;
  updated: string | null;
  organizer: {  email: string | null;
  displayName: string | null;} | null;
  attendees?: ({  email: string | null;
  displayName: string | null;
  responseStatus: string | null;})[] | undefined;
  recurringEventId: string | null;
  transparency: string | null;
  visibility: string | null;})[];
  /**
   * Pagination cursor for next page. Null if no more pages.
   */
  next_cursor: string | null;
};

export interface ActionInput_google_calendar_listsettings {
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of entries returned on one result page. Default is 100. Maximum is 250.
   */
  max_results?: number | undefined;
};

export interface ActionOutput_google_calendar_listsettings {
  /**
   * List of user settings
   */
  items: ({  /**
   * The id of the user setting
   */
  id: string;
  /**
   * Value of the user setting
   */
  value: string;
  /**
   * Type of the resource
   */
  kind?: string | undefined;
  /**
   * ETag of the resource
   */
  etag?: string | undefined;})[];
  /**
   * Token used to access the next page of results. Null if no further results are available.
   */
  next_cursor: string | null;
};

export interface ActionInput_google_calendar_listupcomingevents {
  /**
   * Calendar ID. Use "primary" for the main calendar or a specific calendar ID. Example: "primary"
   */
  calendar_id?: string | undefined;
  /**
   * Pagination token from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of events to return per page (1-2500). Default: 250
   */
  limit?: number | undefined;
  /**
   * RFC3339 timestamp to fetch events from (e.g., "2026-03-12T00:00:00Z"). Defaults to current time if not provided.
   */
  time_min?: string | undefined;
};

export interface ActionOutput_google_calendar_listupcomingevents {
  /**
   * List of upcoming events
   */
  events: ({  id: string;
  /**
   * Event title
   */
  summary: string | null;
  /**
   * Event description
   */
  description: string | null;
  /**
   * Event location
   */
  location: string | null;
  /**
   * Start time
   */
  start: {  dateTime?: string | null | undefined;
  date?: string | null | undefined;
  timeZone?: string | null | undefined;};
  /**
   * End time
   */
  end: {  dateTime?: string | null | undefined;
  date?: string | null | undefined;
  timeZone?: string | null | undefined;};
  /**
   * Event status (confirmed, tentative, cancelled)
   */
  status: string;
  /**
   * Link to event in Google Calendar
   */
  htmlLink: string | null;
  /**
   * When the event was created
   */
  created: string | null;
  /**
   * When the event was last updated
   */
  updated: string | null;
  creator?: {  email?: string | null | undefined;
  displayName?: string | null | undefined;};
  organizer?: {  email?: string | null | undefined;
  displayName?: string | null | undefined;};
  attendees?: ({  email?: string | null | undefined;
  displayName?: string | null | undefined;
  responseStatus?: string | null | undefined;})[];})[];
  /**
   * Token for fetching the next page. Null if no more pages.
   */
  next_cursor: string | null;
};

export interface ActionInput_google_calendar_moveevent {
  /**
   * Calendar identifier of the source calendar where the event currently is. Example: "primary"
   */
  calendar_id: string;
  /**
   * Event identifier. Example: "abc123def456"
   */
  event_id: string;
  /**
   * Calendar identifier of the target calendar where the event is to be moved to. Example: "secondary-calendar-id"
   */
  destination_calendar_id: string;
  /**
   * Guests who should receive notifications about the change of the event's organizer. Acceptable values: "all", "externalOnly", "none". Default: "none"
   */
  send_updates?: 'all' | 'externalOnly' | 'none' | undefined;
};

export interface ActionOutput_google_calendar_moveevent {
  id: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  start: {  date: string | null;
  dateTime: string | null;
  timeZone: string | null;};
  end: {  date: string | null;
  dateTime: string | null;
  timeZone: string | null;};
  organizer?: {  email: string | null;
  displayName: string | null;} | undefined;
  htmlLink?: string | null | undefined;
  created?: string | null | undefined;
  updated?: string | null | undefined;
  status?: string | null | undefined;
};

export interface ActionInput_google_calendar_patchevent {
  /**
   * Event ID to patch. Example: "abc123def456"
   */
  event_id: string;
  /**
   * Calendar ID (defaults to "primary"). Example: "primary" or "user@example.com"
   */
  calendar_id?: string | undefined;
  /**
   * Event title/summary
   */
  summary?: string | undefined;
  /**
   * Event description
   */
  description?: string | undefined;
  /**
   * Event location
   */
  location?: string | undefined;
  /**
   * Event start time
   */
  start?: {  /**
   * Start time in RFC3339 format. Example: "2024-12-01T10:00:00-05:00"
   */
  dateTime?: string | undefined;
  /**
   * Start date (for all-day events). Example: "2024-12-01"
   */
  date?: string | undefined;
  /**
   * Time zone for the start time. Example: "America/New_York"
   */
  timeZone?: string | undefined;};
  /**
   * Event end time
   */
  end?: {  /**
   * End time in RFC3339 format. Example: "2024-12-01T11:00:00-05:00"
   */
  dateTime?: string | undefined;
  /**
   * End date (for all-day events). Example: "2024-12-01"
   */
  date?: string | undefined;
  /**
   * Time zone for the end time. Example: "America/New_York"
   */
  timeZone?: string | undefined;};
};

export interface ActionOutput_google_calendar_patchevent {
  /**
   * Event ID
   */
  id: string;
  /**
   * Event title/summary
   */
  summary: string | null;
  /**
   * Event description
   */
  description: string | null;
  /**
   * Event location
   */
  location: string | null;
  start?: {  dateTime: string | null;
  date: string | null;
  timeZone: string | null;} | undefined;
  end?: {  dateTime: string | null;
  date: string | null;
  timeZone: string | null;} | undefined;
  /**
   * Link to the event in Google Calendar
   */
  htmlLink: string | null;
  /**
   * Event creation timestamp
   */
  created: string | null;
  /**
   * Last update timestamp
   */
  updated: string | null;
  /**
   * Event status (confirmed, tentative, cancelled)
   */
  status: string | null;
};

export interface ActionInput_google_calendar_queryfreebusy {
  /**
   * The start of the interval for the query formatted as per RFC3339. Example: "2024-01-01T00:00:00Z"
   */
  time_min: string;
  /**
   * The end of the interval for the query formatted as per RFC3339. Example: "2024-01-02T00:00:00Z"
   */
  time_max: string;
  /**
   * Time zone used in the response. The default is UTC. Example: "UTC"
   */
  time_zone?: string | undefined;
  /**
   * Maximal number of calendar identifiers to be provided for a single group. Maximum value is 100.
   */
  group_expansion_max?: number | undefined;
  /**
   * Maximal number of calendars for which FreeBusy information is to be provided. Maximum value is 50.
   */
  calendar_expansion_max?: number | undefined;
  /**
   * List of calendars and/or groups to query
   */
  items: ({  /**
   * The identifier of a calendar or a group
   */
  id: string;})[];
};

export interface ActionOutput_google_calendar_queryfreebusy {
  kind: string;
  time_min: string;
  time_max: string;
  groups?: {  [key: string]: {  errors?: ({  domain: string;
  reason: string;})[] | undefined;
  calendars: string[];};};
  calendars: {  [key: string]: {  errors?: ({  domain: string;
  reason: string;})[] | undefined;
  busy: ({  start: string;
  end: string;})[];};};
};

export interface ActionInput_google_calendar_quickaddevent {
  /**
   * Calendar identifier. Use "primary" for the primary calendar. Example: "primary"
   */
  calendar_id?: string | undefined;
  /**
   * The text describing the event to be created. Example: "Meeting with John tomorrow at 2pm"
   */
  text: string;
  /**
   * Guests who should receive notifications about the creation of the new event. Acceptable values: "all", "externalOnly", "none".
   */
  send_updates?: 'all' | 'externalOnly' | 'none' | undefined;
};

export interface ActionOutput_google_calendar_quickaddevent {
  /**
   * The unique ID of the event.
   */
  id: string;
  /**
   * The title of the event.
   */
  summary: string | null;
  /**
   * The description of the event.
   */
  description: string | null;
  /**
   * The start time of the event.
   */
  start: {  dateTime: string | null;
  date: string | null;
  timeZone: string | null;};
  /**
   * The end time of the event.
   */
  end: {  dateTime: string | null;
  date: string | null;
  timeZone: string | null;};
  /**
   * A link to the event in Google Calendar.
   */
  htmlLink: string | null;
  /**
   * The creation time of the event.
   */
  created: string | null;
  /**
   * The last modification time of the event.
   */
  updated: string | null;
  /**
   * The status of the event.
   */
  status: string | null;
  /**
   * The creator of the event.
   */
  creator?: {  email: string | null;
  displayName: string | null;} | undefined;
  /**
   * The organizer of the event.
   */
  organizer?: {  email: string | null;
  displayName: string | null;} | undefined;
};

export interface ActionInput_google_calendar_removeattendee {
  /**
   * Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.
   */
  calendar_id: string;
  /**
   * Event identifier.
   */
  event_id: string;
  /**
   * Email address of the attendee to remove from the event.
   */
  attendee_email: string;
};

export interface ActionOutput_google_calendar_removeattendee {
  id: string;
  summary: string | null;
  attendees: ({  email: string;
  displayName?: string | undefined;
  organizer?: boolean | undefined;
  self?: boolean | undefined;
  resource?: boolean | undefined;
  optional?: boolean | undefined;
  responseStatus?: string | undefined;
  comment?: string | undefined;
  additionalGuests?: number | undefined;})[];
  removed_attendee: {  email: string;
  displayName?: string | undefined;
  organizer?: boolean | undefined;
  self?: boolean | undefined;
  resource?: boolean | undefined;
  optional?: boolean | undefined;
  responseStatus?: string | undefined;
  comment?: string | undefined;
  additionalGuests?: number | undefined;} | null;
  success: boolean;
};

export interface ActionInput_google_calendar_removecalendarfromlist {
  /**
   * Calendar ID to remove from the user's calendar list. Example: "primary" or a calendar ID like "abc123xyz@group.calendar.google.com"
   */
  calendar_id: string;
};

export interface ActionOutput_google_calendar_removecalendarfromlist {
  /**
   * Whether the calendar was successfully removed from the list
   */
  success: boolean;
};

export interface ActionInput_google_calendar_searchevents {
  /**
   * Free text search terms to find events. Searches in summary, description, location, attendee display names, and attendee emails.
   */
  query: string;
  /**
   * Calendar identifier. Use "primary" for the primary calendar. To retrieve calendar IDs, use the calendarList.list method. Defaults to "primary".
   */
  calendar_id?: string | undefined;
  /**
   * Lower bound (inclusive) for an event's start time to filter by. RFC3339 timestamp format (e.g., "2024-01-01T00:00:00Z").
   */
  time_min?: string | undefined;
  /**
   * Upper bound (exclusive) for an event's end time to filter by. RFC3339 timestamp format (e.g., "2024-12-31T23:59:59Z").
   */
  time_max?: string | undefined;
  /**
   * Maximum number of events to return per page. Acceptable values are 1 to 2500. Defaults to 250.
   */
  max_results?: number | undefined;
  /**
   * Pagination token from a previous response. Omit for the first page.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_google_calendar_searchevents {
  events: ({  id: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  html_link: string | null;
  created_at: string | null;
  updated_at: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  organizer_email: string | null;
  attendees: ({  id?: string | null | undefined;
  email?: string | null | undefined;
  display_name?: string | null | undefined;
  response_status?: string | null | undefined;
  optional?: boolean | undefined;
  organizer?: boolean | undefined;})[];
  recurring_event_id: string | null;
  transparency: string | null;
  visibility: string | null;})[];
  /**
   * Token for the next page of results. Null if no more pages.
   */
  next_cursor: string | null;
  /**
   * Total number of events in this page.
   */
  total_items: number;
};

export interface ActionInput_google_calendar_settings {
  /**
   * Pagination cursor (pageToken) from previous response. Omit for first page.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_google_calendar_settings {
  /**
   * List of user settings
   */
  settings: ({  /**
   * The id of the user setting
   */
  id: string;
  /**
   * Value of the user setting
   */
  value: string;
  /**
   * ETag of the resource
   */
  etag?: string | undefined;
  /**
   * Type of the resource
   */
  kind?: string | undefined;})[];
  /**
   * Pagination cursor for next page, or null if no more pages
   */
  next_cursor: string | null;
};

export interface ActionInput_google_calendar_stopchannel {
  /**
   * A UUID or similar unique string that identifies this channel. Example: "01234567-89ab-cdef-0123456789ab"
   */
  id: string;
  /**
   * An opaque ID that identifies the resource being watched on this channel. Stable across different API versions.
   */
  resourceId: string;
  /**
   * An arbitrary string delivered to the target address with each notification delivered over this channel. Optional.
   */
  token?: string | undefined;
};

export interface ActionOutput_google_calendar_stopchannel {
  success: boolean;
};

export interface ActionInput_google_calendar_updateaclrule {
  /**
   * Calendar identifier. Use "primary" for the primary calendar.
   */
  calendar_id: string;
  /**
   * ACL rule identifier.
   */
  rule_id: string;
  /**
   * The role assigned to the scope.
   */
  role?: 'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner' | undefined;
  /**
   * The extent to which calendar access is granted.
   */
  scope?: {  /**
   * The type of the scope.
   */
  type: 'default' | 'user' | 'group' | 'domain';
  /**
   * The email address of a user or group, or the name of a domain.
   */
  value?: string | undefined;};
  /**
   * Whether to send notifications about the calendar sharing change.
   */
  send_notifications?: boolean | undefined;
};

export interface ActionOutput_google_calendar_updateaclrule {
  id: string;
  scope: {  type: string;
  value?: string | undefined;};
  role: string;
  etag?: string | undefined;
  kind?: string | undefined;
};

export interface ActionInput_google_calendar_updateattendeeresponse {
  /**
   * Calendar ID. Defaults to "primary". Example: "primary"
   */
  calendar_id?: string | undefined;
  /**
   * Event ID. Example: "abc123"
   */
  event_id: string;
  /**
   * Email of the attendee to update. Example: "user@example.com"
   */
  attendee_email: string;
  /**
   * Response status for the attendee
   */
  response_status: 'needsAction' | 'declined' | 'tentative' | 'accepted';
};

export interface ActionOutput_google_calendar_updateattendeeresponse {
  id: string;
  htmlLink: string;
  summary: string | null;
  attendees: ({  email: string;
  responseStatus: string;})[];
};

export interface ActionInput_google_calendar_updatecalendarlistentry {
  /**
   * Calendar identifier. Use "primary" for the primary calendar. Example: "primary" or "abc123@group.calendar.google.com"
   */
  calendar_id: string;
  /**
   * Main color in hex format (e.g., "#0088aa"). Requires color_rgb_format=true.
   */
  background_color?: string | undefined;
  /**
   * Foreground color in hex format (e.g., "#ffffff"). Requires color_rgb_format=true.
   */
  foreground_color?: string | undefined;
  /**
   * Color ID from the calendar colors endpoint
   */
  color_id?: string | undefined;
  /**
   * Whether the calendar is hidden from the list
   */
  hidden?: boolean | undefined;
  /**
   * Whether the calendar content shows up in the calendar UI
   */
  selected?: boolean | undefined;
  /**
   * Custom summary name for this calendar
   */
  summary_override?: string | undefined;
  /**
   * Default reminders for events in this calendar
   */
  default_reminders?: ({  method: 'email' | 'popup';
  minutes: number;})[] | undefined;
  /**
   * Notification settings for this calendar
   */
  notification_settings?: {  notifications: ({  type: 'eventCreation' | 'eventChange' | 'eventCancellation' | 'eventResponse' | 'agenda';
  method: 'email';})[];} | undefined;
  /**
   * Set to true if using background_color or foreground_color
   */
  color_rgb_format?: boolean | undefined;
};

export interface ActionOutput_google_calendar_updatecalendarlistentry {
  id: string;
  summary: string;
  summary_override: string | null;
  description: string | null;
  location: string | null;
  time_zone: string | null;
  color_id: string | null;
  background_color: string | null;
  foreground_color: string | null;
  hidden: boolean;
  selected: boolean;
  access_role: string | null;
  primary: boolean;
  default_reminders: ({  method: string;
  minutes: number;})[];
  notification_settings?: {  notifications: ({  type: string;
  method: string;})[];} | undefined;
};

export interface ActionInput_google_calendar_updatecalendar {
  /**
   * Calendar identifier. To retrieve calendar IDs call the calendarList.list method. If you want to access the primary calendar of the currently logged in user, use the "primary" keyword. Example: "primary" or "abc123xyz@group.calendar.google.com"
   */
  calendar_id: string;
  /**
   * Title of the calendar.
   */
  summary?: string | undefined;
  /**
   * Description of the calendar.
   */
  description?: string | undefined;
  /**
   * Geographic location of the calendar as free-form text.
   */
  location?: string | undefined;
  /**
   * The time zone of the calendar. Formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich".
   */
  time_zone?: string | undefined;
};

export interface ActionOutput_google_calendar_updatecalendar {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  time_zone: string | null;
  kind: string;
  etag: string;
  data_owner: string | null;
  auto_accept_invitations: boolean | null;
  conference_properties: {  allowed_conference_solution_types: string[];} | null;
};

export interface ActionInput_google_calendar_updateevent {
  /**
   * Calendar identifier. Use "primary" for the main calendar
   */
  calendar_id: string;
  /**
   * Event identifier
   */
  event_id: string;
  /**
   * Title of the event
   */
  summary?: string | undefined;
  /**
   * Description of the event
   */
  description?: string | undefined;
  /**
   * Geographic location of the event
   */
  location?: string | undefined;
  /**
   * Start time of the event
   */
  start?: {  /**
   * Date in yyyy-mm-dd format for all-day events
   */
  date?: string | undefined;
  /**
   * DateTime in RFC3339 format for timed events
   */
  dateTime?: string | undefined;
  /**
   * Time zone (IANA format, e.g., "Europe/Zurich")
   */
  timeZone?: string | undefined;};
  /**
   * End time of the event
   */
  end?: {  /**
   * Date in yyyy-mm-dd format for all-day events
   */
  date?: string | undefined;
  /**
   * DateTime in RFC3339 format for timed events
   */
  dateTime?: string | undefined;
  /**
   * Time zone (IANA format, e.g., "Europe/Zurich")
   */
  timeZone?: string | undefined;};
  /**
   * Attendees of the event
   */
  attendees?: ({  id?: string | undefined;
  email?: string | undefined;
  displayName?: string | undefined;
  organizer?: boolean | undefined;
  self?: boolean | undefined;
  resource?: boolean | undefined;
  optional?: boolean | undefined;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted' | undefined;
  comment?: string | undefined;
  additionalGuests?: number | undefined;})[];
  /**
   * Status of the event
   */
  status?: 'confirmed' | 'tentative' | 'cancelled' | undefined;
  /**
   * Visibility of the event
   */
  visibility?: 'default' | 'public' | 'private' | 'confidential' | undefined;
  /**
   * Color ID of the event
   */
  colorId?: string | undefined;
  /**
   * Reminders for the event
   */
  reminders?: {  useDefault?: boolean | undefined;
  overrides?: ({  method: 'email' | 'popup';
  minutes: number;})[] | undefined;};
  /**
   * Who should receive notifications about the event update
   */
  send_updates?: 'all' | 'externalOnly' | 'none' | undefined;
};

export interface ActionOutput_google_calendar_updateevent {
  id: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  start: {  /**
   * Date in yyyy-mm-dd format for all-day events
   */
  date?: string | undefined;
  /**
   * DateTime in RFC3339 format for timed events
   */
  dateTime?: string | undefined;
  /**
   * Time zone (IANA format, e.g., "Europe/Zurich")
   */
  timeZone?: string | undefined;} | null;
  end: {  /**
   * Date in yyyy-mm-dd format for all-day events
   */
  date?: string | undefined;
  /**
   * DateTime in RFC3339 format for timed events
   */
  dateTime?: string | undefined;
  /**
   * Time zone (IANA format, e.g., "Europe/Zurich")
   */
  timeZone?: string | undefined;} | null;
  status: string | null;
  visibility: string | null;
  htmlLink: string | null;
  created: string | null;
  updated: string | null;
  organizer: {  id?: string | undefined;
  email?: string | undefined;
  displayName?: string | undefined;
  self?: boolean | undefined;} | null;
  attendees: ({  id?: string | undefined;
  email?: string | undefined;
  displayName?: string | undefined;
  organizer?: boolean | undefined;
  self?: boolean | undefined;
  resource?: boolean | undefined;
  optional?: boolean | undefined;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted' | undefined;
  comment?: string | undefined;
  additionalGuests?: number | undefined;})[] | null;
};

export interface ActionInput_google_calendar_watchcalendarlist {
  /**
   * A UUID or similar unique string that identifies this channel. Example: "01234567-89ab-cdef-0123456789ab"
   */
  id: string;
  /**
   * The address where notifications are delivered for this channel. Example: "https://example.com/webhook"
   */
  address: string;
  /**
   * An arbitrary string delivered to the target address with each notification delivered over this channel. Optional.
   */
  token?: string | undefined;
  /**
   * The time-to-live in seconds for the notification channel. Default is 604800 seconds (7 days).
   */
  ttl?: number | undefined;
};

export interface ActionOutput_google_calendar_watchcalendarlist {
  /**
   * Identifies this as a notification channel. Value is "api#channel".
   */
  kind: string;
  /**
   * A UUID or similar unique string that identifies this channel.
   */
  id: string;
  /**
   * An opaque ID that identifies the resource being watched on this channel. Stable across different API versions.
   */
  resourceId: string;
  /**
   * A version-specific identifier for the watched resource.
   */
  resourceUri: string;
  /**
   * An arbitrary string delivered to the target address with each notification delivered over this channel. Optional.
   */
  token: string | null;
  /**
   * Date and time of notification channel expiration, expressed as a Unix timestamp, in milliseconds. Optional.
   */
  expiration: number | null;
};

export interface ActionInput_google_calendar_watchevents {
  /**
   * Calendar identifier. To retrieve calendar IDs call the calendarList.list method. Use "primary" for the primary calendar.
   */
  calendar_id: string;
  /**
   * A unique UUID or similar unique string that identifies this channel.
   */
  channel_id: string;
  /**
   * The URL where notifications will be delivered.
   */
  webhook_url: string;
  /**
   * An opaque token for verification. Google will include this token in notification messages.
   */
  token?: string | undefined;
  /**
   * Time-to-live in seconds for the notification channel. Default is 604800 seconds (7 days).
   */
  ttl?: number | undefined;
};

export interface ActionOutput_google_calendar_watchevents {
  /**
   * Identifies this as a notification channel, which is "api#channel".
   */
  kind: string;
  /**
   * The channel ID.
   */
  id: string;
  /**
   * An opaque ID that identifies the resource being watched on this channel.
   */
  resource_id: string;
  /**
   * A version-specific canonical URL for the watched resource.
   */
  resource_uri: string;
  /**
   * The token sent in the request (if any).
   */
  token: string | null;
  /**
   * Expiration time as a Unix timestamp (long), or null if no expiration.
   */
  expiration: string | null;
};

export interface ActionInput_google_calendar_watchsettings {
  /**
   * A UUID or similar unique string that identifies this channel. Example: "01234567-89ab-cdef-0123-456789abcdef"
   */
  channel_id: string;
  /**
   * The address where notifications are delivered for this channel. Must be a valid HTTPS URL that is reachable by Google servers.
   */
  callback_url: string;
  /**
   * The type of delivery mechanism used for this channel. Valid values are "web_hook" or "webhook". Both refer to HTTP request delivery.
   */
  channel_type: 'web_hook' | 'webhook';
  /**
   * An arbitrary string delivered to the target address with each notification. Optional but useful for verifying webhook authenticity.
   */
  channel_token?: string | undefined;
  /**
   * The time-to-live in seconds for the notification channel. Default is 604800 seconds (7 days).
   */
  ttl?: string | undefined;
};

export interface ActionOutput_google_calendar_watchsettings {
  /**
   * Identifies this as a notification channel, value is "api#channel".
   */
  kind: string;
  /**
   * The unique string that identifies this channel.
   */
  channel_id: string;
  /**
   * An opaque ID that identifies the resource being watched on this channel.
   */
  resource_id: string;
  /**
   * A version-specific identifier for the watched resource.
   */
  resource_uri: string;
  /**
   * The arbitrary string delivered with each notification.
   */
  channel_token: string | null;
  /**
   * Date and time of notification channel expiration, expressed as a Unix timestamp in milliseconds.
   */
  expiration: string | number | null;
};

export interface ActionInput_google_calendar_whoami {
};

export interface ActionOutput_google_calendar_whoami {
  /**
   * Google account ID
   */
  id: string;
  /**
   * Google account email address
   */
  email: string;
};
