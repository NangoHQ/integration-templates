import { createSync } from 'nango';
import { z } from 'zod';

const GroupPropertySchema = z.object({
    id: z.string(),
    group_type: z.string().optional(),
    group_property: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    enum_values: z.string().optional(),
    regex: z.string().optional(),
    is_array_type: z.boolean().optional(),
    is_hidden: z.boolean().optional(),
    classifications: z.array(z.string()).optional()
});

const ProviderGroupPropertySchema = z.object({
    group_type: z.string().optional().nullable(),
    group_property: z.string(),
    description: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    enum_values: z.string().optional().nullable(),
    regex: z.string().optional().nullable(),
    is_array_type: z.boolean().optional(),
    is_hidden: z.boolean().optional(),
    classifications: z.array(z.string()).optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(ProviderGroupPropertySchema.passthrough())
});

const sync = createSync({
    description: 'Sync Amplitude taxonomy group properties',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/group-properties'
        }
    ],
    models: {
        GroupProperty: GroupPropertySchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/2/taxonomy/group-property has no changed-since filter,
        // no pagination, no resumable cursor, and no deleted-record endpoint.
        await nango.trackDeletesStart('GroupProperty');

        // https://amplitude.com/docs/apis/analytics/taxonomy#get-group-properties
        const response = await nango.get({
            endpoint: '/api/2/taxonomy/group-property',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse group properties response: ${parsed.error.message}`);
        }

        if (!parsed.data.success) {
            throw new Error('Amplitude taxonomy group-property API returned success: false');
        }

        const records = parsed.data.data.map((item) => {
            const id = item.group_type != null ? `${item.group_type}:${item.group_property}` : item.group_property;
            return {
                id,
                ...(item.group_type != null && { group_type: item.group_type }),
                group_property: item.group_property,
                ...(item.description != null && { description: item.description }),
                ...(item.type != null && { type: item.type }),
                ...(item.enum_values != null && { enum_values: item.enum_values }),
                ...(item.regex != null && { regex: item.regex }),
                ...(item.is_array_type != null && { is_array_type: item.is_array_type }),
                ...(item.is_hidden != null && { is_hidden: item.is_hidden }),
                ...(item.classifications != null && { classifications: item.classifications })
            };
        });

        if (records.length > 0) {
            await nango.batchSave(records, 'GroupProperty');
        }

        await nango.trackDeletesEnd('GroupProperty');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
