import { createSync } from 'nango';
import { z } from 'zod';

const CalendarSchema = z.object({
    id: z.string(),
    summary: z.string(),
    description: z.union([z.string(), z.null()]),
    location: z.union([z.string(), z.null()]),
    timeZone: z.union([z.string(), z.null()]),
    accessRole: z.string(),
    colorId: z.union([z.string(), z.null()]),
    backgroundColor: z.union([z.string(), z.null()]),
    foregroundColor: z.union([z.string(), z.null()]),
    hidden: z.boolean().optional(),
    selected: z.boolean(),
    primary: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const CheckpointSchema = z.object({
    sync_token: z.string(),
    page_token: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: "Full sync of the user's calendar list, including access role, colors, primary/selected flags, and deleted status.",
    version: '1.0.0',
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/calendar-list',
            group: 'CalendarList'
        }
    ],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Calendar: CalendarSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        const syncToken = checkpoint?.sync_token;
        let pageToken = checkpoint?.page_token || undefined;

        while (true) {
            const params: Record<string, string | number> = {
                maxResults: 250,
                ...(pageToken && { pageToken })
            };

            if (syncToken) {
                params['syncToken'] = syncToken;
                params['showDeleted'] = 'true';
                params['showHidden'] = 'true';
            }

            const response = await nango.get<{
                items?: Array<{
                    id: string;
                    summary: string;
                    description?: string;
                    location?: string;
                    timeZone?: string;
                    accessRole: string;
                    colorId?: string;
                    backgroundColor?: string;
                    foregroundColor?: string;
                    hidden?: boolean;
                    selected?: boolean;
                    primary?: boolean;
                    deleted?: boolean;
                }>;
                nextPageToken?: string;
                nextSyncToken?: string;
            }>({
                // https://developers.google.com/calendar/api/v3/reference/calendarList/list
                endpoint: '/calendar/v3/users/me/calendarList',
                params,
                retries: 3
            });

            const calendars = (response.data.items ?? []).map((item) => ({
                id: item.id,
                summary: item.summary,
                description: item.description ?? null,
                location: item.location ?? null,
                timeZone: item.timeZone ?? null,
                accessRole: item.accessRole,
                colorId: item.colorId ?? null,
                backgroundColor: item.backgroundColor ?? null,
                foregroundColor: item.foregroundColor ?? null,
                hidden: item.hidden ?? false,
                selected: item.selected ?? false,
                primary: item.primary ?? false,
                deleted: item.deleted ?? false
            }));

            const deletedCalendars = calendars.filter((calendar) => calendar.deleted);
            const activeCalendars = calendars.filter((calendar) => !calendar.deleted);

            if (activeCalendars.length > 0) {
                await nango.batchSave(activeCalendars, 'Calendar');
            }

            if (deletedCalendars.length > 0) {
                await nango.batchDelete(
                    deletedCalendars.map((calendar) => ({ id: calendar.id })),
                    'Calendar'
                );
            }

            const nextPageToken = response.data.nextPageToken;
            if (nextPageToken) {
                pageToken = nextPageToken;
                await nango.saveCheckpoint({
                    sync_token: syncToken ?? '',
                    page_token: pageToken
                });
                continue;
            }

            if (response.data.nextSyncToken) {
                await nango.saveCheckpoint({
                    sync_token: response.data.nextSyncToken,
                    page_token: ''
                });
            } else if (!syncToken) {
                await nango.clearCheckpoint();
            } else {
                await nango.saveCheckpoint({
                    sync_token: syncToken,
                    page_token: ''
                });
            }

            break;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
