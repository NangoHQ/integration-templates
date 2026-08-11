import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    sync_token: z.string()
});

const CalendarListEnvelopeSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    nextPageToken: z.string().optional(),
    nextSyncToken: z.string().optional(),
    items: z.array(z.unknown()).optional()
});

const ProviderCalendarListEntrySchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
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
    primary: z.boolean().optional(),
    deleted: z.boolean().optional(),
    defaultReminders: z
        .array(
            z.object({
                method: z.string().optional(),
                minutes: z.number().optional()
            })
        )
        .optional(),
    notificationSettings: z
        .object({
            notifications: z
                .array(
                    z.object({
                        type: z.string().optional(),
                        method: z.string().optional()
                    })
                )
                .optional()
        })
        .optional(),
    conferenceProperties: z
        .object({
            allowedConferenceSolutionTypes: z.array(z.string()).optional()
        })
        .optional()
});

const CalendarListEntrySchema = z
    .object({
        id: z.string().describe('The identifier of the calendar.'),
        summary: z.string().optional().describe('Title of the calendar.'),
        description: z.string().optional().describe('Description of the calendar.'),
        location: z.string().optional().describe('Geographic location of the calendar as free-form text.'),
        timeZone: z.string().optional().describe('The time zone of the calendar.'),
        summaryOverride: z.string().optional().describe('The summary that the authenticated user has set for this calendar.'),
        colorId: z.string().optional().describe('The color ID of the calendar referring to an entry in the calendar section of the colors definition.'),
        backgroundColor: z.string().optional().describe('The main color of the calendar in hexadecimal format.'),
        foregroundColor: z.string().optional().describe('The foreground color of the calendar in hexadecimal format.'),
        hidden: z.boolean().optional().describe('Whether the calendar has been hidden from the list.'),
        selected: z.boolean().optional().describe('Whether the calendar content shows up in the calendar UI.'),
        accessRole: z.string().optional().describe('The effective access role that the authenticated user has on the calendar.'),
        primary: z.boolean().optional().describe('Whether the calendar is the primary calendar of the authenticated user.'),
        deleted: z.boolean().optional().describe('Whether this calendar list entry has been deleted from the calendar list.'),
        defaultReminders: z
            .array(
                z
                    .object({
                        method: z.string().optional().describe('The method used by this reminder.'),
                        minutes: z.number().optional().describe('Number of minutes before the start of the event when the reminder should trigger.')
                    })
                    .describe('A default reminder for the calendar.')
            )
            .optional()
            .describe('The default reminders that the authenticated user has for this calendar.'),
        notificationSettings: z
            .object({
                notifications: z
                    .array(
                        z
                            .object({
                                type: z.string().optional().describe('The type of notification.'),
                                method: z.string().optional().describe('The method used to deliver the notification.')
                            })
                            .describe('A notification setting for the calendar.')
                    )
                    .optional()
                    .describe('The list of notifications set for this calendar.')
            })
            .optional()
            .describe('The notifications that the authenticated user is receiving for this calendar.'),
        conferenceProperties: z
            .object({
                allowedConferenceSolutionTypes: z
                    .array(z.string())
                    .optional()
                    .describe('The types of conference solutions that are supported for this calendar.')
            })
            .optional()
            .describe('Conferencing properties for this calendar, for example what types of conferences are allowed.')
    })
    .describe("A calendar list entry representing a calendar in the user's calendar list.");

function isSyncTokenExpiredError(error: unknown): boolean {
    if (error instanceof Error && (error.message.includes('410') || error.message.includes('GONE'))) {
        return true;
    }

    if (error === null || typeof error !== 'object') {
        return false;
    }

    if ('status' in error && typeof error.status === 'number' && error.status === 410) {
        return true;
    }

    if ('code' in error && typeof error.code === 'number' && error.code === 410) {
        return true;
    }

    if ('response' in error && error.response !== null && typeof error.response === 'object') {
        const response = error.response;
        if ('status' in response && typeof response.status === 'number' && response.status === 410) {
            return true;
        }
    }

    return false;
}

const sync = createSync({
    description: "Full sync of the user's calendar list, including access role, colors, primary/selected flags, and deleted status.",
    version: '3.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CalendarListEntry: CalendarListEntrySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const syncToken = checkpoint && typeof checkpoint['sync_token'] === 'string' ? checkpoint['sync_token'] : undefined;

        const runWithToken = async (token: string | undefined) => {
            const isFullSync = token === undefined;
            let nextSyncToken: string | undefined;

            if (isFullSync) {
                await nango.trackDeletesStart('CalendarListEntry');
            }

            const proxyConfig: ProxyConfiguration = {
                // https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list
                endpoint: '/calendar/v3/users/me/calendarList',
                params: {
                    showDeleted: 'true',
                    showHidden: 'true',
                    ...(token ? { syncToken: token } : {})
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'pageToken',
                    cursor_path_in_response: 'nextPageToken',
                    response_path: 'items',
                    limit_name_in_request: 'maxResults',
                    limit: 100,
                    on_page: async ({ response }) => {
                        const parsed = CalendarListEnvelopeSchema.safeParse(response.data);
                        if (parsed.success && parsed.data.nextSyncToken) {
                            nextSyncToken = parsed.data.nextSyncToken;
                        }
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const entries = page.map((item: unknown) => {
                    const parsed = ProviderCalendarListEntrySchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse calendar list entry: ${parsed.error.message}`);
                    }
                    return parsed.data;
                });

                const upserts = entries
                    .filter((entry) => !entry.deleted)
                    .map((entry) => ({
                        id: entry.id,
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
                        ...(entry.deleted !== undefined && { deleted: entry.deleted }),
                        ...(entry.defaultReminders !== undefined && { defaultReminders: entry.defaultReminders }),
                        ...(entry.notificationSettings !== undefined && { notificationSettings: entry.notificationSettings }),
                        ...(entry.conferenceProperties !== undefined && { conferenceProperties: entry.conferenceProperties })
                    }));

                const deletions = entries.filter((entry) => entry.deleted).map((entry) => ({ id: entry.id }));

                if (upserts.length > 0) {
                    await nango.batchSave(upserts, 'CalendarListEntry');
                }

                if (deletions.length > 0) {
                    await nango.batchDelete(deletions, 'CalendarListEntry');
                }
            }

            if (isFullSync) {
                await nango.trackDeletesEnd('CalendarListEntry');
            }

            if (nextSyncToken) {
                await nango.saveCheckpoint({ sync_token: nextSyncToken });
            }
        };

        // @allowTryCatch Google Calendar returns 410 GONE when syncToken expires.
        // We clear the token and perform a full resync so stale calendars are removed too.
        try {
            await runWithToken(syncToken);
        } catch (error) {
            if (syncToken && isSyncTokenExpiredError(error)) {
                await nango.clearCheckpoint();
                await runWithToken(undefined);
            } else {
                throw error;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
