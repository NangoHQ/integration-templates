import { createSync } from 'nango';
import { z } from 'zod';

const EventTypeSchema = z.object({
    id: z.string().describe('Stable identifier for the event type (event_type name)'),
    event_type: z.string().describe('The event type name'),
    category_name: z.string().optional().describe('The category name'),
    description: z.string().optional().describe('The event type description'),
    display_name: z.string().optional().describe('The display name'),
    is_active: z.boolean().optional().describe('Whether the event type is active'),
    is_hidden_from_dropdowns: z.boolean().optional().describe('Whether hidden from dropdowns'),
    is_hidden_from_persona_results: z.boolean().optional().describe('Whether hidden from persona results'),
    is_hidden_from_pathfinder: z.boolean().optional().describe('Whether hidden from pathfinder'),
    is_hidden_from_timeline: z.boolean().optional().describe('Whether hidden from timeline'),
    tags: z.array(z.string()).optional().describe('List of tags'),
    owner: z.string().optional().describe('Owner of the event type'),
    deleted: z.boolean().optional().describe('Whether the event type is deleted')
});

const MetadataSchema = z.object({
    showDeleted: z.boolean().optional().describe('Include deleted event types in the response')
});

const TaxonomyEventResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(
        z.object({
            event_type: z.string(),
            category: z
                .object({
                    name: z.string().optional()
                })
                .optional()
                .nullable(),
            description: z.string().optional().nullable(),
            display_name: z.string().optional().nullable(),
            is_active: z.boolean().optional(),
            is_hidden_from_dropdowns: z.boolean().optional(),
            is_hidden_from_persona_results: z.boolean().optional(),
            is_hidden_from_pathfinder: z.boolean().optional(),
            is_hidden_from_timeline: z.boolean().optional(),
            tags: z.array(z.string()).optional(),
            owner: z.string().optional().nullable(),
            deleted: z.boolean().optional().nullable()
        })
    )
});

const sync = createSync({
    description: 'Sync Amplitude taxonomy event types',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        EventType: EventTypeSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/event-types'
        }
    ],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata ?? {});

        // Blocker: provider only exposes /api/2/taxonomy/event with no changed-since filter,
        // no deleted-record endpoint, no pagination, and no resumable cursor.
        const showDeleted = metadata.showDeleted === true;
        if (!showDeleted) {
            await nango.trackDeletesStart('EventType');
        }

        // https://amplitude.com/docs/apis/analytics/taxonomy
        const response = await nango.get({
            endpoint: '/api/2/taxonomy/event',
            params: showDeleted ? { showDeleted: 'true' } : {},
            retries: 3
        });

        const parsed = TaxonomyEventResponseSchema.parse(response.data);

        const eventTypes = parsed.data.map((record) => {
            return {
                id: record.event_type,
                event_type: record.event_type,
                ...(record.category?.name && { category_name: record.category.name }),
                ...(record.description != null && { description: record.description }),
                ...(record.display_name != null && { display_name: record.display_name }),
                ...(record.is_active !== undefined && { is_active: record.is_active }),
                ...(record.is_hidden_from_dropdowns !== undefined && {
                    is_hidden_from_dropdowns: record.is_hidden_from_dropdowns
                }),
                ...(record.is_hidden_from_persona_results !== undefined && {
                    is_hidden_from_persona_results: record.is_hidden_from_persona_results
                }),
                ...(record.is_hidden_from_pathfinder !== undefined && {
                    is_hidden_from_pathfinder: record.is_hidden_from_pathfinder
                }),
                ...(record.is_hidden_from_timeline !== undefined && {
                    is_hidden_from_timeline: record.is_hidden_from_timeline
                }),
                ...(record.tags !== undefined && { tags: record.tags }),
                ...(record.owner != null && { owner: record.owner }),
                ...(record.deleted != null && { deleted: record.deleted })
            };
        });

        if (eventTypes.length > 0) {
            await nango.batchSave(eventTypes, 'EventType');
        }

        if (!showDeleted) {
            await nango.trackDeletesEnd('EventType');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
