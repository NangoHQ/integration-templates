import { createSync } from 'nango';
import { z } from 'zod';

const EventPropertySchema = z.object({
    id: z.string(),
    event_property: z.string(),
    event_type: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    regex: z.string().optional(),
    enum_values: z.string().optional(),
    is_array_type: z.boolean().optional(),
    is_required: z.boolean().optional(),
    is_hidden: z.boolean().optional(),
    classifications: z.array(z.string()).optional(),
    deleted: z.boolean().optional()
});

const ProviderEventPropertySchema = z.object({
    event_property: z.string(),
    event_type: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    regex: z.string().nullable().optional(),
    enum_values: z.string().nullable().optional(),
    is_array_type: z.boolean().optional(),
    is_required: z.boolean().optional(),
    is_hidden: z.boolean().optional(),
    classifications: z.array(z.string()).optional(),
    deleted: z.boolean().optional()
});

const ApiResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(z.unknown())
});

const sync = createSync({
    description: 'Sync Amplitude taxonomy event properties',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    models: {
        EventProperty: EventPropertySchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/event-properties'
        }
    ],

    exec: async (nango) => {
        // Blocker: provider only exposes GET /api/2/taxonomy/event-property with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('EventProperty');

        // https://amplitude.com/docs/apis/analytics/taxonomy
        const response = await nango.get({
            endpoint: '/api/2/taxonomy/event-property',
            params: {
                showDeleted: 'true'
            },
            retries: 3
        });

        const validatedResponse = ApiResponseSchema.safeParse(response.data);
        if (!validatedResponse.success) {
            throw new Error(`Failed to parse taxonomy event properties response: ${validatedResponse.error.message}`);
        }

        if (!validatedResponse.data.success) {
            throw new Error('Taxonomy event properties API returned success: false');
        }

        const rawProperties = validatedResponse.data.data;
        const properties = rawProperties.map((raw) => {
            const parsed = ProviderEventPropertySchema.safeParse(raw);
            if (!parsed.success) {
                throw new Error(`Failed to parse event property record: ${parsed.error.message}`);
            }

            const record = parsed.data;
            return {
                id: record.event_property,
                event_property: record.event_property,
                ...(record.event_type != null && { event_type: record.event_type }),
                ...(record.description != null && { description: record.description }),
                ...(record.type != null && { type: record.type }),
                ...(record.regex != null && { regex: record.regex }),
                ...(record.enum_values != null && { enum_values: record.enum_values }),
                ...(record.is_array_type !== undefined && { is_array_type: record.is_array_type }),
                ...(record.is_required !== undefined && { is_required: record.is_required }),
                ...(record.is_hidden !== undefined && { is_hidden: record.is_hidden }),
                ...(record.classifications !== undefined && { classifications: record.classifications }),
                ...(record.deleted !== undefined && { deleted: record.deleted })
            };
        });

        if (properties.length > 0) {
            await nango.batchSave(properties, 'EventProperty');
        }

        await nango.trackDeletesEnd('EventProperty');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
