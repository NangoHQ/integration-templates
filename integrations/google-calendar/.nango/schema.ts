export interface SyncMetadata_google_calendar_calendars {
};

export interface GoogleCalendar {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  description: string;
  location: string;
  timeZone: string;
  summaryOverride: string;
  colorId: string;
  backgroundColor: string;
  foregroundColor: string;
  hidden: boolean;
  selected: boolean;
  accessRole: string;
  defaultReminders: ({  method: string;
  minutes: number;})[];
  notificationSettings: {  notifications: ({  type: string;
  method: string;})[];};
  primary: boolean;
  deleted: boolean;
  conferenceProperties: {  allowedConferenceSolutionTypes: string[];};
};

export interface SyncMetadata_google_calendar_events {
  calendarsToSync: string[];
  timeMin?: string | undefined;
  timeMax?: string | undefined;
  singleEvents?: boolean | undefined;
};

export interface GoogleCalendarEvent {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string | undefined;
  location?: string | undefined;
  colorId?: string | undefined;
  creator?: {  id?: string | undefined;
  email?: string | undefined;
  displayName?: string | undefined;
  self?: boolean | undefined;};
  organizer?: {  id?: string | undefined;
  email?: string | undefined;
  displayName?: string | undefined;
  self?: boolean | undefined;};
  start: {  date?: string | undefined;
  dateTime?: string | undefined;
  timeZone?: string | undefined;};
  end: {  date?: string | undefined;
  dateTime?: string | undefined;
  timeZone?: string | undefined;};
  endTimeUnspecified?: boolean | undefined;
  recurrence?: string[] | undefined;
  recurringEventId?: string | undefined;
  originalStartTime?: {  date?: string | undefined;
  dateTime?: string | undefined;
  timeZone?: string | undefined;};
  transparency?: string | undefined;
  visibility?: string | undefined;
  iCalUID?: string | undefined;
  sequence?: number | undefined;
  attendees?: ({  id?: string | undefined;
  email?: string | undefined;
  displayName?: string | undefined;
  organizer?: boolean | undefined;
  self?: boolean | undefined;
  resource?: boolean | undefined;
  optional?: boolean | undefined;
  responseStatus?: string | undefined;
  comment?: string | undefined;
  additionalGuests?: number | undefined;})[];
  attendeesOmitted?: boolean | undefined;
  extendedProperties?: {  private?: {} | undefined;
  shared?: {} | undefined;};
  hangoutLink?: string | undefined;
  conferenceData?: {  createRequest?: {  requestId: string;
  conferenceSolutionKey: {  type: string;};
  status: {  statusCode: string;};} | undefined;
  entryPoints?: ({  entryPointType: string;
  uri?: string | undefined;
  label?: string | undefined;
  pin?: string | undefined;
  accessCode?: string | undefined;
  meetingCode?: string | undefined;
  passcode?: string | undefined;
  password?: string | undefined;
  regionCode?: string | undefined;})[];
  conferenceSolution?: {  key: {  type: string;};
  name: string;
  iconUri: string;} | undefined;
  conferenceId?: string | undefined;
  signature?: string | undefined;
  notes?: string | undefined;
  parameters?: {  addOnParameters?: {  parameters?: {} | undefined;};};};
  gadget?: {  type?: string | undefined;
  title?: string | undefined;
  link?: string | undefined;
  iconLink?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  display?: string | undefined;
  preferences?: {} | undefined;};
  anyoneCanAddSelf?: boolean | undefined;
  guestsCanInviteOthers?: boolean | undefined;
  guestsCanModify?: boolean | undefined;
  guestsCanSeeOtherGuests?: boolean | undefined;
  privateCopy?: boolean | undefined;
  locked?: boolean | undefined;
  reminders?: {  useDefault: boolean;
  overrides?: ({  method: string;
  minutes: number;})[] | undefined;};
  outOfOfficeProperties?: {  autoDeclineMode?: string | undefined;
  declineMessage?: string | undefined;};
  source?: {  url?: string | undefined;
  title?: string | undefined;};
  workingLocationProperties?: {  type: string;
  homeOffice?: any | undefined;
  customLocation?: {  label?: string | undefined;};
  officeLocation?: {  buildingId?: string | undefined;
  floorId?: string | undefined;
  floorSectionId?: string | undefined;
  deskId?: string | undefined;
  label?: string | undefined;};};
  attachments?: ({  fileUrl: string;
  title?: string | undefined;
  mimeType?: string | undefined;
  iconLink?: string | undefined;
  fileId?: string | undefined;})[];
  eventType?: string | undefined;
};

export interface ActionInput_google_calendar_addattendee {
  calendar_id: string;
  event_id: string;
  email: string;
  responseStatus?: string | undefined;
  optional?: boolean | undefined;
};

export interface ActionOutput_google_calendar_addattendee {
  kind: string;
  etag: string;
  id: string;
  attendees: any[];
};

export interface ActionInput_google_calendar_clearcalendar {
  calendar_id: string;
};

export interface ActionOutput_google_calendar_clearcalendar {
  success: boolean;
};

export interface ActionInput_google_calendar_createaclrule {
  calendar_id: string;
  role: string;
  scope_type: string;
  scope_value?: string | undefined;
};

export interface ActionOutput_google_calendar_createaclrule {
  kind: string;
  etag: string;
  id: string;
  scope?: any | undefined;
  role: string;
};

export interface ActionInput_google_calendar_createalldayevent {
  calendar_id: string;
  summary: string;
  start_date: string;
  end_date: string;
  description?: string | undefined;
};

export interface ActionOutput_google_calendar_createalldayevent {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  start?: any | undefined;
  end?: any | undefined;
};

export interface ActionInput_google_calendar_createcalendar {
  summary: string;
  description?: string | undefined;
  timeZone?: string | undefined;
};

export interface ActionOutput_google_calendar_createcalendar {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  timeZone: string;
};

export interface ActionInput_google_calendar_createevent {
  calendar_id: string;
  summary: string;
  start?: any | undefined;
  end?: any | undefined;
  description?: string | undefined;
  location?: string | undefined;
  attendees?: any[] | undefined;
  reminders?: any | undefined;
};

export interface ActionOutput_google_calendar_createevent {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  summary: string;
  start?: any | undefined;
  end?: any | undefined;
};

export interface ActionInput_google_calendar_createrecurringevent {
  calendar_id: string;
  summary: string;
  start?: any | undefined;
  end?: any | undefined;
  recurrence: string[];
  description?: string | undefined;
};

export interface ActionOutput_google_calendar_createrecurringevent {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  recurrence: string[];
};

export interface ActionInput_google_calendar_deleteaclrule {
  calendar_id: string;
  rule_id: string;
};

export interface ActionOutput_google_calendar_deleteaclrule {
  success: boolean;
};

export interface ActionInput_google_calendar_deletecalendar {
  calendar_id: string;
};

export interface ActionOutput_google_calendar_deletecalendar {
  success: boolean;
};

export interface ActionInput_google_calendar_deleteevent {
  calendar_id: string;
  event_id: string;
  sendUpdates?: string | undefined;
};

export interface ActionOutput_google_calendar_deleteevent {
  success: boolean;
};

export interface ActionInput_google_calendar_findfreeslots {
  timeMin: string;
  timeMax: string;
  calendar_ids: string[];
  duration_minutes: number;
  timeZone?: string | undefined;
};

export interface ActionOutput_google_calendar_findfreeslots {
  free_slots: any[];
};

export interface ActionInput_google_calendar_getaclrule {
  calendar_id: string;
  rule_id: string;
};

export interface ActionOutput_google_calendar_getaclrule {
  kind: string;
  etag: string;
  id: string;
  scope?: any | undefined;
  role: string;
};

export interface ActionInput_google_calendar_getcalendarlistentry {
  calendar_id: string;
};

export interface ActionOutput_google_calendar_getcalendarlistentry {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  accessRole: string;
  backgroundColor?: string | undefined;
  foregroundColor?: string | undefined;
};

export interface ActionInput_google_calendar_getcalendar {
  calendar_id: string;
};

export interface ActionOutput_google_calendar_getcalendar {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  description?: string | undefined;
  timeZone: string;
};

export interface ActionInput_google_calendar_getcolors {
};

export interface ActionOutput_google_calendar_getcolors {
  kind: string;
  updated: string;
  calendar?: any | undefined;
  event?: any | undefined;
};

export interface ActionInput_google_calendar_geteventinstances {
  calendar_id: string;
  event_id: string;
  timeMin?: string | undefined;
  timeMax?: string | undefined;
  maxResults?: number | undefined;
  pageToken?: string | undefined;
};

export interface ActionOutput_google_calendar_geteventinstances {
  kind: string;
  etag: string;
  summary: string;
  nextPageToken?: string | undefined;
  items: any[];
};

export interface ActionInput_google_calendar_getevent {
  calendar_id: string;
  event_id: string;
};

export interface ActionOutput_google_calendar_getevent {
  kind: string;
  etag: string;
  id: string;
  status: string;
  summary: string;
  start?: any | undefined;
  end?: any | undefined;
};

export interface ActionInput_google_calendar_getsetting {
  setting_id: string;
};

export interface ActionOutput_google_calendar_getsetting {
  kind: string;
  etag: string;
  id: string;
  value: string;
};

export interface ActionInput_google_calendar_importevent {
  calendar_id: string;
  iCalUID: string;
  start?: any | undefined;
  end?: any | undefined;
  summary?: string | undefined;
};

export interface ActionOutput_google_calendar_importevent {
  kind: string;
  etag: string;
  id: string;
  iCalUID: string;
  status: string;
};

export interface ActionInput_google_calendar_insertcalendartolist {
  id: string;
  colorRgbFormat?: boolean | undefined;
  backgroundColor?: string | undefined;
  foregroundColor?: string | undefined;
};

export interface ActionOutput_google_calendar_insertcalendartolist {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  accessRole: string;
};

export interface ActionInput_google_calendar_listaclrules {
  calendar_id: string;
  maxResults?: number | undefined;
  pageToken?: string | undefined;
};

export interface ActionOutput_google_calendar_listaclrules {
  kind: string;
  etag: string;
  nextPageToken?: string | undefined;
  items: any[];
};

export interface ActionInput_google_calendar_listcalendars {
  maxResults?: number | undefined;
  pageToken?: string | undefined;
  showDeleted?: boolean | undefined;
  showHidden?: boolean | undefined;
};

export interface ActionOutput_google_calendar_listcalendars {
  kind: string;
  etag: string;
  nextPageToken?: string | undefined;
  items: any[];
};

export interface ActionInput_google_calendar_listevents {
  calendar_id: string;
  timeMin?: string | undefined;
  timeMax?: string | undefined;
  maxResults?: number | undefined;
  pageToken?: string | undefined;
  q?: string | undefined;
  singleEvents?: boolean | undefined;
  orderBy?: string | undefined;
};

export interface ActionOutput_google_calendar_listevents {
  kind: string;
  etag: string;
  summary: string;
  nextPageToken?: string | undefined;
  items: any[];
};

export interface ActionInput_google_calendar_listsettings {
  maxResults?: number | undefined;
  pageToken?: string | undefined;
};

export interface ActionOutput_google_calendar_listsettings {
  kind: string;
  etag: string;
  nextPageToken?: string | undefined;
  items: any[];
};

export interface ActionInput_google_calendar_listupcomingevents {
  calendar_id: string;
  maxResults?: number | undefined;
  singleEvents?: boolean | undefined;
  timeMin?: string | undefined;
};

export interface ActionOutput_google_calendar_listupcomingevents {
  kind: string;
  items: any[];
  nextPageToken?: string | undefined;
};

export interface ActionInput_google_calendar_moveevent {
  calendar_id: string;
  event_id: string;
  destination_calendar_id: string;
};

export interface ActionOutput_google_calendar_moveevent {
  kind: string;
  etag: string;
  id: string;
  status: string;
  summary: string;
  organizer?: any | undefined;
};

export interface ActionInput_google_calendar_patchevent {
  calendar_id: string;
  event_id: string;
  summary?: string | undefined;
  start?: any | undefined;
  end?: any | undefined;
  description?: string | undefined;
  location?: string | undefined;
};

export interface ActionOutput_google_calendar_patchevent {
  kind: string;
  etag: string;
  id: string;
  status: string;
  summary: string;
};

export interface ActionInput_google_calendar_queryfreebusy {
  timeMin: string;
  timeMax: string;
  items: any[];
  timeZone?: string | undefined;
};

export interface ActionOutput_google_calendar_queryfreebusy {
  kind: string;
  timeMin: string;
  timeMax: string;
  calendars?: any | undefined;
};

export interface ActionInput_google_calendar_quickaddevent {
  calendar_id: string;
  text: string;
};

export interface ActionOutput_google_calendar_quickaddevent {
  kind: string;
  etag: string;
  id: string;
  status: string;
  summary: string;
  start?: any | undefined;
  end?: any | undefined;
};

export interface ActionInput_google_calendar_removeattendee {
  calendar_id: string;
  event_id: string;
  email: string;
};

export interface ActionOutput_google_calendar_removeattendee {
  kind: string;
  etag: string;
  id: string;
  attendees: any[];
};

export interface ActionInput_google_calendar_removecalendarfromlist {
  calendar_id: string;
};

export interface ActionOutput_google_calendar_removecalendarfromlist {
  success: boolean;
};

export interface ActionInput_google_calendar_searchevents {
  calendar_id: string;
  q: string;
  timeMin?: string | undefined;
  timeMax?: string | undefined;
  maxResults?: number | undefined;
};

export interface ActionOutput_google_calendar_searchevents {
  kind: string;
  items: any[];
  nextPageToken?: string | undefined;
};

export type ActionInput_google_calendar_settings = void

export interface ActionOutput_google_calendar_settings {
  settings: ({  kind: string;
  etag: string;
  id: string;
  value: string;})[];
};

export interface ActionInput_google_calendar_updateaclrule {
  calendar_id: string;
  rule_id: string;
  role: string;
  scope_type: string;
  scope_value?: string | undefined;
};

export interface ActionOutput_google_calendar_updateaclrule {
  kind: string;
  etag: string;
  id: string;
  scope?: any | undefined;
  role: string;
};

export interface ActionInput_google_calendar_updateattendeeresponse {
  calendar_id: string;
  event_id: string;
  email: string;
  responseStatus: string;
};

export interface ActionOutput_google_calendar_updateattendeeresponse {
  kind: string;
  etag: string;
  id: string;
  attendees: any[];
};

export interface ActionInput_google_calendar_updatecalendarlistentry {
  calendar_id: string;
  colorRgbFormat?: boolean | undefined;
  backgroundColor?: string | undefined;
  foregroundColor?: string | undefined;
  hidden?: boolean | undefined;
  selected?: boolean | undefined;
};

export interface ActionOutput_google_calendar_updatecalendarlistentry {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  accessRole: string;
};

export interface ActionInput_google_calendar_updatecalendar {
  calendar_id: string;
  summary?: string | undefined;
  description?: string | undefined;
  timeZone?: string | undefined;
};

export interface ActionOutput_google_calendar_updatecalendar {
  kind: string;
  etag: string;
  id: string;
  summary: string;
  timeZone: string;
};

export interface ActionInput_google_calendar_updateevent {
  calendar_id: string;
  event_id: string;
  summary?: string | undefined;
  start?: any | undefined;
  end?: any | undefined;
  description?: string | undefined;
  location?: string | undefined;
  attendees?: any[] | undefined;
};

export interface ActionOutput_google_calendar_updateevent {
  kind: string;
  etag: string;
  id: string;
  status: string;
  summary: string;
  start?: any | undefined;
  end?: any | undefined;
};

export type ActionInput_google_calendar_whoami = void

export interface ActionOutput_google_calendar_whoami {
  id: string;
  email: string;
};
