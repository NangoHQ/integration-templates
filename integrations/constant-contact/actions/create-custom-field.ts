import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        label: z
            .string()
            .min(1)
            .describe('Display label of the custom field. The API derives the machine-readable `name` slug from this label. Example: "Favorite Color"'),
        type: z.enum(['string', 'date']).describe('Data type of the custom field. Use "string" for free-text values or "date" for date values.')
    })
    .describe('Input for creating a contact custom field definition.');

const ProviderCustomFieldSchema = z.object({
    custom_field_id: z.string(),
    label: z.string(),
    name: z.string(),
    type: z.string(),
    metadata: z
        .object({
            display_format: z.string()
        })
        .optional(),
    version: z.number(),
    updated_at: z.string(),
    created_at: z.string()
});

const OutputSchema = z
    .object({
        custom_field_id: z
            .string()
            .describe(
                'Unique identifier of the created custom field. Use this ID to reference the field on contacts. Example: "d62956d0-9b7a-4c0e-8f5e-2f6f8f6f6f6f"'
            ),
        label: z.string().describe('Display label of the custom field as stored by Constant Contact.'),
        name: z.string().describe('Machine-readable slug auto-derived from the label. Example: "favorite_color"'),
        type: z.string().describe('Data type of the custom field, e.g. "string" or "date".'),
        metadata: z
            .object({
                display_format: z.string().describe('Expected display format for date-type fields. Example: "YYYY-MM-DD"')
            })
            .optional()
            .describe('Additional type-specific metadata returned by Constant Contact. Present for date-type fields.'),
        version: z.number().describe('Version number of the custom field definition. Example: 1'),
        created_at: z.string().describe('ISO 8601 timestamp when the custom field was created. Example: "2026-09-29T18:35:43Z"'),
        updated_at: z.string().describe('ISO 8601 timestamp when the custom field was last updated. Example: "2026-09-29T18:35:43Z"')
    })
    .describe('The created contact custom field definition.');

/**
 * @tags: [write]
 * @tagReason: Creates a new contact custom field definition in the provider account.
 * @pitfalls: Labels must be unique across the account; a duplicate label fails with a 409 conflict. The machine-readable `name` slug is auto-derived from `label`, cannot be chosen directly, and is regenerated if the label is ever renamed, so use `custom_field_id` as the stable identifier for the field.
 */
const action = createAction({
    description: 'Create a contact custom field definition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: '/v3/contact_custom_fields',
            data: {
                label: input.label,
                type: input.type
            },
            // Not idempotent: no idempotency key exists, and a retry after a lost response would create a duplicate custom field.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const customField = ProviderCustomFieldSchema.parse(response.data);

        return {
            custom_field_id: customField.custom_field_id,
            label: customField.label,
            name: customField.name,
            type: customField.type,
            ...(customField.metadata !== undefined && { metadata: customField.metadata }),
            version: customField.version,
            created_at: customField.created_at,
            updated_at: customField.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
