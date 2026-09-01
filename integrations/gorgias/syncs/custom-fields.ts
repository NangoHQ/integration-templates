import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCustomFieldSchema = z.object({
    id: z.number(),
    external_id: z.string().nullable().optional(),
    object_type: z.string(),
    label: z.string(),
    description: z.string().nullable().optional(),
    priority: z.number(),
    required: z.boolean(),
    managed_type: z.string().nullable().optional(),
    definition: z.record(z.string(), z.unknown()).nullable().optional(),
    created_datetime: z.string(),
    updated_datetime: z.string(),
    deactivated_datetime: z.string().nullable().optional()
});

const CustomFieldSchema = z
    .object({
        id: z.string().describe('Stable ID of the custom field definition'),
        external_id: z.string().optional().describe('ID of the custom field in a foreign system'),
        object_type: z.string().describe('Type of entity this custom field applies to (Ticket or Customer)'),
        label: z.string().describe('Display name of the custom field'),
        description: z.string().optional().describe('Description of the custom field'),
        priority: z.number().describe('Order in which custom fields are displayed'),
        required: z.boolean().describe('Whether this custom field is mandatory'),
        managed_type: z.string().optional().describe('The type of the managed field if applicable'),
        definition: z.record(z.string(), z.unknown()).optional().describe('Data-type-specific settings for this custom field'),
        created_datetime: z.string().describe('When the custom field was created'),
        updated_datetime: z.string().describe('When the custom field was last updated'),
        deactivated_datetime: z.string().optional().describe('When the custom field was deactivated')
    })
    .describe('A custom field definition in Gorgias');

const sync = createSync({
    description: 'Sync custom field definitions for both tickets and customers',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        CustomField: CustomFieldSchema
    },

    exec: async (nango) => {
        const objectTypes = ['Ticket', 'Customer'];

        await nango.trackDeletesStart('CustomField');

        for (const objectType of objectTypes) {
            const params: Record<string, string> = {
                object_type: objectType
            };
            const config: ProxyConfiguration = {
                // https://developers.gorgias.com/reference/list-custom-fields
                endpoint: '/api/custom-fields',
                params,
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'meta.next_cursor',
                    cursor_name_in_request: 'cursor',
                    response_path: 'data',
                    limit_name_in_request: 'limit',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate(config)) {
                const customFields = [];
                for (const item of page) {
                    const parsed = ProviderCustomFieldSchema.parse(item);
                    customFields.push({
                        id: String(parsed.id),
                        external_id: parsed.external_id ?? undefined,
                        object_type: parsed.object_type,
                        label: parsed.label,
                        description: parsed.description ?? undefined,
                        priority: parsed.priority,
                        required: parsed.required,
                        managed_type: parsed.managed_type ?? undefined,
                        definition: parsed.definition ?? undefined,
                        created_datetime: parsed.created_datetime,
                        updated_datetime: parsed.updated_datetime,
                        deactivated_datetime: parsed.deactivated_datetime ?? undefined
                    });
                }

                if (customFields.length > 0) {
                    await nango.batchSave(customFields, 'CustomField');
                }
            }
        }

        await nango.trackDeletesEnd('CustomField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
