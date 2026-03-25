import { createSync } from 'nango';
import { z } from 'zod';

const CalendarListEntrySchema = z.object({
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
    deleted: z.boolean().optional()
});

const CalendarSchema = z.object({
    id: z.string(),
    summary: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    location: z.union([z.string(), z.null()]),
    timeZone: z.union([z.string(), z.null()]),
    summaryOverride: z.union([z.string(), z.null()]),
    colorId: z.union([z.string(), z.null()]),
    backgroundColor: z.union([z.string(), z.null()]),
    foregroundColor: z.union([z.string(), z.null()]),
    hidden: z.boolean(),
    selected: z.boolean(),
    accessRole: z.union([z.string(), z.null()]),
    primary: z.boolean(),
    deleted: z.boolean()
});

const CheckpointSchema = z.object({
    syncToken: z.string(),
    pageToken: z.string()
});

const CalendarListResponseSchema = z.object({
    items: z.array(z.unknown()),
    nextPageToken: z.string().optional(),
    nextSyncToken: z.string().optional()
});

const sync = createSync({
    description: "Full sync of the user's calendar list, including access role, colors, primary/selected flags, and deleted status.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Calendar: CalendarSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/calendar-list'
        }
    ],
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const syncToken = checkpoint?.['syncToken'];

        let pageToken: string | undefined = checkpoint?.['pageToken'];
        let nextSyncToken: string | undefined;
        let hasMorePages = true;

        // https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list
        while (hasMorePages) {
            const params: Record<string, string | number> = {
                maxResults: 250,
                showDeleted: 'true',
                showHidden: 'true'
            };

            if (typeof syncToken === 'string') {
                params['syncToken'] = syncToken;
            }

            if (typeof pageToken === 'string') {
                params['pageToken'] = pageToken;
            }

            const response = await nango.get({
                endpoint: '/calendar/v3/users/me/calendarList',
                params,
                retries: 3
            });

            const parsedResponse = CalendarListResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                break;
            }

            const responseData = parsedResponse.data;
            const items = responseData.items;
            nextSyncToken = responseData.nextSyncToken;

            const calendars: z.infer<typeof CalendarSchema>[] = [];
            const deletions: { id: string }[] = [];

            for (const item of items) {
                const parsed = CalendarListEntrySchema.safeParse(item);
                if (!parsed.success) {
                    continue;
                }

                const entry = parsed.data;

                if (entry.deleted) {
                    deletions.push({ id: entry.id });
                } else {
                    calendars.push({
                        id: entry.id,
                        summary: entry.summary ?? null,
                        description: entry.description ?? null,
                        location: entry.location ?? null,
                        timeZone: entry.timeZone ?? null,
                        summaryOverride: entry.summaryOverride ?? null,
                        colorId: entry.colorId ?? null,
                        backgroundColor: entry.backgroundColor ?? null,
                        foregroundColor: entry.foregroundColor ?? null,
                        hidden: entry.hidden ?? false,
                        selected: entry.selected ?? false,
                        accessRole: entry.accessRole ?? null,
                        primary: entry.primary ?? false,
                        deleted: entry.deleted ?? false
                    });
                }
            }

            if (calendars.length > 0) {
                await nango.batchSave(calendars, 'Calendar');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Calendar');
            }

            if (responseData.nextPageToken) {
                pageToken = responseData.nextPageToken;
                await nango.saveCheckpoint({
                    syncToken: typeof syncToken === 'string' ? syncToken : '',
                    pageToken
                });
            } else {
                hasMorePages = false;
            }
        }

        if (nextSyncToken) {
            await nango.saveCheckpoint({
                syncToken: nextSyncToken,
                pageToken: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
