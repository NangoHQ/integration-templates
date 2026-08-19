import { createSync } from 'nango';
import type { EventTypeResponse } from '../types.js';

import { EventType } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    cursor: z.string()
});

const PaginationSchema = z.object({
    pagination: z
        .object({
            nextCursor: z.string().optional().nullable(),
            cursor: z.string().optional().nullable()
        })
        .optional(),
    nextCursor: z.string().optional().nullable()
});

const sync = createSync({
    description: 'Retrieve all event types per a user',
    version: '2.1.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/event/types'
        }
    ],

    models: {
        EventType: EventType
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor: string | undefined = checkpoint?.cursor ?? undefined;

        await nango.trackDeletesStart('EventType');

        for await (const groups of nango.paginate<EventTypeResponse['data']['eventTypeGroups'][number]>({
            // https://cal.com/docs/api-reference/v2/event-types/get-all-event-types
            endpoint: '/event-types',
            params: {
                ...(cursor && { cursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'pagination.nextCursor',
                response_path: 'data.eventTypeGroups',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    const parsed = PaginationSchema.safeParse(response.data);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse event types pagination: ${parsed.error.message}`);
                    }

                    const nextCursor =
                        (typeof nextPageParam === 'string' ? nextPageParam : undefined) ??
                        parsed.data.pagination?.nextCursor ??
                        parsed.data.pagination?.cursor ??
                        parsed.data.nextCursor;

                    cursor = nextCursor ?? undefined;
                }
            },
            retries: 10
        })) {
            const eventTypes: EventType[] = [];
            for (const group of groups) {
                eventTypes.push(...group.eventTypes);
            }

            if (eventTypes.length) {
                await nango.batchSave(eventTypes, 'EventType');
            }

            if (cursor) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('EventType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
