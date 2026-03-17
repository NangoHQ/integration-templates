import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CalendarSchema = z.object({
    id: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    accessRole: z.string(),
    colorId: z.string().optional(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional(),
    hidden: z.boolean().optional(),
    selected: z.boolean(),
    primary: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const CheckpointSchema = z.object({
    syncToken: z.string()
});

const CalendarListItemSchema = z.object({
    id: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    accessRole: z.string(),
    colorId: z.string().optional(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional(),
    hidden: z.boolean().optional(),
    selected: z.boolean().optional(),
    primary: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const CalendarListResponseSchema = z.object({
    nextSyncToken: z.string().optional()
});

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
        const checkpointResult = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const checkpoint = checkpointResult.success ? checkpointResult.data : undefined;
        const syncToken = checkpoint?.syncToken;

        // Build params object properly
        const params: Record<string, string | number> = {
            maxResults: 250
        };

        if (syncToken) {
            params['syncToken'] = syncToken;
            params['showDeleted'] = 'true';
            params['showHidden'] = 'true';
        }

        // https://developers.google.com/calendar/api/v3/reference/calendarList/list
        const proxyConfig = {
            endpoint: '/calendar/v3/users/me/calendarList',
            params,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'nextPageToken',
                cursor_name_in_request: 'pageToken',
                response_path: 'items',
                limit: 250
            },
            retries: 3
        } satisfies ProxyConfiguration;

        for await (const batch of nango.paginate(proxyConfig)) {
            const items = z.array(CalendarListItemSchema).parse(batch);
            const calendars = items.map((item) => ({
                id: item.id,
                summary: item.summary,
                description: item.description ?? undefined,
                location: item.location ?? undefined,
                timeZone: item.timeZone ?? undefined,
                accessRole: item.accessRole,
                colorId: item.colorId ?? undefined,
                backgroundColor: item.backgroundColor ?? undefined,
                foregroundColor: item.foregroundColor ?? undefined,
                hidden: item.hidden ?? false,
                selected: item.selected ?? false,
                primary: item.primary ?? false,
                deleted: item.deleted ?? false
            }));

            // Handle deleted calendars
            const deletedCalendars = calendars.filter((c) => c.deleted);
            const activeCalendars = calendars.filter((c) => !c.deleted);

            if (activeCalendars.length > 0) {
                await nango.batchSave(activeCalendars, 'Calendar');
            }

            if (deletedCalendars.length > 0) {
                await nango.batchDelete(
                    deletedCalendars.map((c) => ({ id: c.id })),
                    'Calendar'
                );
            }
        }

        // For incremental sync, we need to get the nextSyncToken
        // Make a single request to get the sync token
        const finalParams: Record<string, string | number> = {
            maxResults: 1
        };

        if (syncToken) {
            finalParams['syncToken'] = syncToken;
            finalParams['showDeleted'] = 'true';
            finalParams['showHidden'] = 'true';
        }

        const finalResponse = await nango.get({
            endpoint: '/calendar/v3/users/me/calendarList',
            params: finalParams,
            retries: 3
        });

        const finalData = CalendarListResponseSchema.parse(finalResponse.data);

        if (finalData.nextSyncToken) {
            await nango.saveCheckpoint({
                syncToken: finalData.nextSyncToken
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
