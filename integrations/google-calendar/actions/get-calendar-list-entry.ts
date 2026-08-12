import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z
            .string()
            .describe(
                'Calendar identifier. To retrieve calendar IDs call the calendarList.list method. Use "primary" for the primary calendar of the authenticated user.'
            )
    })
    .describe('Input to retrieve a calendar list entry.');

const ProviderDefaultReminderSchema = z.object({
    method: z.string().optional().describe('The method used by this reminder. Possible values are "email" and "popup".'),
    minutes: z.number().optional().describe('Number of minutes before the start of the event when the reminder should trigger.')
});

const ProviderNotificationSchema = z.object({
    type: z.string().optional().describe('The type of notification.'),
    method: z.string().optional().describe('The method used to deliver the notification.')
});

const ProviderNotificationSettingsSchema = z.object({
    notifications: z.array(ProviderNotificationSchema).optional().describe('The list of notifications set for this calendar.')
});

const ProviderConferencePropertiesSchema = z.object({
    allowedConferenceSolutionTypes: z.array(z.string()).optional().describe('The types of conference solutions that are supported for this calendar.')
});

const ProviderCalendarListEntrySchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    summaryOverride: z.string().optional(),
    colorId: z.string().optional(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional(),
    hidden: z.boolean().optional(),
    selected: z.boolean().optional(),
    accessRole: z.string().optional(),
    defaultReminders: z.array(ProviderDefaultReminderSchema).optional(),
    notificationSettings: ProviderNotificationSettingsSchema.optional(),
    primary: z.boolean().optional(),
    deleted: z.boolean().optional(),
    conferenceProperties: ProviderConferencePropertiesSchema.optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier of the calendar.'),
        summary: z.string().optional().describe('Title of the calendar.'),
        description: z.string().optional().describe('Description of the calendar.'),
        location: z.string().optional().describe('Geographic location of the calendar as free-form text.'),
        timeZone: z.string().optional().describe('The time zone of the calendar, formatted as an IANA Time Zone Database name.'),
        summaryOverride: z.string().optional().describe('The summary that the authenticated user has set for this calendar.'),
        colorId: z.string().optional().describe('The color of the calendar as an index-based color ID.'),
        backgroundColor: z.string().optional().describe('The main color of the calendar in hexadecimal format, e.g. "#0088aa".'),
        foregroundColor: z.string().optional().describe('The foreground color of the calendar in hexadecimal format, e.g. "#ffffff".'),
        hidden: z.boolean().optional().describe('Whether the calendar has been hidden from the list.'),
        selected: z.boolean().optional().describe('Whether the calendar content shows up in the calendar UI.'),
        accessRole: z
            .string()
            .optional()
            .describe('The effective access role that the authenticated user has on the calendar. Possible values: freeBusyReader, reader, writer, owner.'),
        primary: z.boolean().optional().describe('Whether the calendar is the primary calendar of the authenticated user.'),
        deleted: z.boolean().optional().describe('Whether this calendar list entry has been deleted from the calendar list.')
    })
    .describe('A calendar list entry with access role and colors.');

/**
 * @tags: [read]
 * @tagReason: Reads a single calendar list entry from the provider.
 * @pitfalls: Returns 404 for accessible calendars not present in the user's calendar list, and omits boolean fields like hidden and primary when their value is false.
 */
const action = createAction({
    description: 'Retrieve a calendar list entry with access role and colors',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/calendar/api/v3/reference/calendarList/get
        const response = await nango.get({
            endpoint: `/calendar/v3/users/me/calendarList/${encodeURIComponent(input.calendarId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Calendar list entry not found',
                calendarId: input.calendarId
            });
        }

        const entry = ProviderCalendarListEntrySchema.parse(response.data);

        return {
            id: entry.id ?? '',
            ...(entry.summary !== undefined && { summary: entry.summary }),
            ...(entry.description !== undefined && { description: entry.description }),
            ...(entry.location !== undefined && { location: entry.location }),
            ...(entry.timeZone !== undefined && { timeZone: entry.timeZone }),
            ...(entry.summaryOverride !== undefined && { summaryOverride: entry.summaryOverride }),
            ...(entry.colorId !== undefined && { colorId: entry.colorId }),
            ...(entry.backgroundColor !== undefined && { backgroundColor: entry.backgroundColor }),
            ...(entry.foregroundColor !== undefined && { foregroundColor: entry.foregroundColor }),
            ...(entry.hidden !== undefined && { hidden: entry.hidden }),
            ...(entry.selected !== undefined && { selected: entry.selected }),
            ...(entry.accessRole !== undefined && { accessRole: entry.accessRole }),
            ...(entry.primary !== undefined && { primary: entry.primary }),
            ...(entry.deleted !== undefined && { deleted: entry.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
