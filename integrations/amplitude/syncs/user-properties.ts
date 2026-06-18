import { createSync } from 'nango';
import { z } from 'zod';

const UserPropertySchema = z.object({
    id: z.string(),
    user_property: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    enum_values: z.string().optional(),
    regex: z.string().optional(),
    is_array_type: z.boolean(),
    is_hidden: z.boolean(),
    classifications: z.array(z.string()).optional(),
    deleted: z.boolean().optional()
});

const ProviderUserPropertySchema = z.object({
    user_property: z.string(),
    description: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    enum_values: z.string().nullable().optional(),
    regex: z.string().nullable().optional(),
    is_array_type: z.boolean(),
    is_hidden: z.boolean(),
    classifications: z.array(z.string()).optional(),
    deleted: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(ProviderUserPropertySchema)
});

const sync = createSync({
    description: 'Sync Amplitude taxonomy user properties.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        UserProperty: UserPropertySchema
    },
    endpoints: [
        {
            path: '/syncs/user-properties',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // https://amplitude.com/docs/apis/analytics/taxonomy
        const response = await nango.get({
            endpoint: '/api/2/taxonomy/user-property',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse user properties response: ${parsed.error.message}`);
        }

        if (!parsed.data.success) {
            throw new Error('Amplitude user properties API returned success: false');
        }

        const items = parsed.data.data;

        await nango.trackDeletesStart('UserProperty');

        const records = items.map((item) => ({
            id: item.user_property,
            user_property: item.user_property,
            ...(item.description != null && { description: item.description }),
            ...(item.type != null && { type: item.type }),
            ...(item.enum_values != null && { enum_values: item.enum_values }),
            ...(item.regex != null && { regex: item.regex }),
            is_array_type: item.is_array_type,
            is_hidden: item.is_hidden,
            ...(item.classifications && { classifications: item.classifications }),
            ...(item.deleted !== undefined && { deleted: item.deleted })
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'UserProperty');
        }

        await nango.trackDeletesEnd('UserProperty');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
