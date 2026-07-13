import { createSync } from 'nango';
import { z } from 'zod';

const CustomFieldValueSchema = z.object({
    color_key: z.string().nullable().optional(),
    entity_type: z.string().optional(),
    id: z.string().describe('UUID of the custom field enum value'),
    position: z.number().optional(),
    value: z.string().optional()
});

const CustomFieldSchema = z.object({
    id: z.string().describe('UUID of the custom field'),
    canonical_name: z.string().optional(),
    created_at: z.string().optional().describe('ISO 8601 timestamp'),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    entity_type: z.string().optional(),
    field_type: z.string().optional(),
    icon_set_identifier: z.string().optional(),
    name: z.string().optional(),
    position: z.number().optional(),
    updated_at: z.string().optional().describe('ISO 8601 timestamp'),
    values: z.array(CustomFieldValueSchema).optional()
});

const sync = createSync({
    description: 'Sync workspace custom field definitions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        CustomField: CustomFieldSchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/v3/custom-fields returns a flat, unpaginated array
        // with no updated_since filter, cursor, or deleted-record endpoint.
        // https://developer.shortcut.com/api/rest/v3#List-Custom-Fields
        const response = await nango.get({
            endpoint: '/api/v3/custom-fields',
            retries: 3
        });

        const parsed = z.array(CustomFieldSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse custom fields: ${parsed.error.message}`);
        }

        await nango.trackDeletesStart('CustomField');

        const customFields = parsed.data;
        if (customFields.length > 0) {
            await nango.batchSave(customFields, 'CustomField');
        }

        await nango.trackDeletesEnd('CustomField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
