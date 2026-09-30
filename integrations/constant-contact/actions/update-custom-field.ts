import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        custom_field_id: z.string().describe('The unique ID of the contact custom field definition to rename. Example: "d97b8ee1-5f47-4f38-9d2f-2c9b1a8e4c10"'),
        label: z
            .string()
            .min(1)
            .max(50)
            .describe(
                'The new display label for the custom field, 1-50 characters. Renaming the label also regenerates the machine-readable name slug. Example: "Favorite Color"'
            )
    })
    .describe('Input for renaming a contact custom field definition');

const ProviderCustomFieldSchema = z.object({
    custom_field_id: z.string(),
    label: z.string(),
    name: z.string(),
    type: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        custom_field_id: z.string().describe('The unique ID of the custom field definition. This is the only stable identifier across renames.'),
        label: z.string().describe('The updated display label of the custom field.'),
        name: z
            .string()
            .describe('The machine-readable slug regenerated from the new label. It changes on every rename, so do not use it as a stable identifier.'),
        type: z.string().describe('The data type of the custom field value (e.g. "string" or "date").'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the custom field definition was created. Example: "2026-09-29T17:34:36Z"'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of when the custom field definition was last updated. Example: "2026-09-29T17:40:12Z"')
    })
    .describe('The renamed contact custom field definition');

/**
 * @tags: [write]
 * @tagReason: Mutates a contact custom field definition by renaming its label.
 * @pitfalls: Renaming the label also regenerates the machine-readable name slug; anything keyed off name breaks after a rename, so treat custom_field_id as the only stable identifier.
 */
const action = createAction({
    description: 'Rename a contact custom field definition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://v3.developer.constantcontact.com/api_reference/index.html
        const response = await nango.put({
            endpoint: `/v3/contact_custom_fields/${encodeURIComponent(input.custom_field_id)}`,
            data: {
                label: input.label
            },
            retries: 3
        });

        const customField = ProviderCustomFieldSchema.parse(response.data);

        return {
            custom_field_id: customField.custom_field_id,
            label: customField.label,
            name: customField.name,
            type: customField.type,
            ...(customField.created_at !== undefined && { created_at: customField.created_at }),
            ...(customField.updated_at !== undefined && { updated_at: customField.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
