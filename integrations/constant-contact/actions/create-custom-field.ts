import { z } from 'zod';
import { createAction } from 'nango';

const CHOICE_TYPES: string[] = ['single_select', 'multi_select'];

const InputChoiceSchema = z.object({
    choice_label: z.string().min(1).describe('Display label of the selectable choice. Example: "Gold"'),
    display_order: z.number().int().optional().describe('Sort order of the choice relative to other choices. Example: 1')
});

const InputSchema = z
    .object({
        label: z
            .string()
            .min(1)
            .max(50)
            .describe(
                'Display label of the custom field, 1-50 characters. The API derives the machine-readable `name` slug from this label. Example: "Favorite Color"'
            ),
        type: z
            .enum(['string', 'date', 'datetime', 'number', 'boolean', 'currency', 'text_area', 'single_select', 'multi_select'])
            .describe(
                'Data type of the custom field: "string" (free text), "date"/"datetime" (date values), "number" (numeric), "boolean" (true/false), "currency" (monetary values), "text_area" (long free text), or "single_select"/"multi_select" (choose one or more from `choices`).'
            ),
        metadata: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Type-specific metadata. For "single_select"/"multi_select", set display_type to "dropdown", "checkbox", or "radio" (required for those types). For "number"/"currency", may include allow_negative, decimal_places, or integer. For "currency", may include currency_code. For "date" version 2 fields, may include display_format.'
            ),
        choices: z
            .array(InputChoiceSchema)
            .optional()
            .describe('Selectable options. Required (non-empty) when type is "single_select" or "multi_select"; ignored for all other types.'),
        version: z
            .number()
            .int()
            .optional()
            .describe('For "date" type only: 1 for legacy string-based date values (default) or 2 for actual date values that support comparisons.')
    })
    .describe('Input for creating a contact custom field definition.')
    .superRefine((value, ctx) => {
        if (CHOICE_TYPES.includes(value.type) && (!value.choices || value.choices.length === 0)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['choices'],
                message: `choices must be a non-empty array when type is "${value.type}"`
            });
        }
    });

const ProviderChoiceSchema = z.object({
    custom_field_id: z.string().optional(),
    choice_id: z.union([z.string(), z.number()]).optional(),
    choice_label: z.string(),
    display_order: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderCustomFieldSchema = z.object({
    custom_field_id: z.string(),
    label: z.string(),
    name: z.string(),
    type: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    choices: z.array(ProviderChoiceSchema).optional(),
    version: z.number(),
    updated_at: z.string(),
    created_at: z.string()
});

const OutputChoiceSchema = z.object({
    custom_field_id: z.string().optional().describe('ID of the parent custom field this choice belongs to.'),
    choice_id: z.union([z.string(), z.number()]).optional().describe('Unique identifier of the choice. Example: 25242'),
    choice_label: z.string().describe('Display label of the choice. Example: "Gold"'),
    display_order: z.number().optional().describe('Sort order of the choice relative to other choices.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the choice was created.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the choice was last updated.')
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
        type: z
            .string()
            .describe(
                'Data type of the custom field, e.g. "string", "date", "datetime", "number", "boolean", "currency", "text_area", "single_select", or "multi_select".'
            ),
        metadata: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Additional type-specific metadata returned by Constant Contact, e.g. display_format for date fields, allow_negative/decimal_places/integer for number/currency fields, currency_code for currency fields, or display_type for single_select/multi_select fields.'
            ),
        choices: z
            .array(OutputChoiceSchema)
            .optional()
            .describe('Selectable options. Present only when type is "single_select" or "multi_select".'),
        version: z.number().describe('Version number of the custom field definition. Example: 1'),
        created_at: z.string().describe('ISO 8601 timestamp when the custom field was created. Example: "2026-09-29T18:35:43Z"'),
        updated_at: z.string().describe('ISO 8601 timestamp when the custom field was last updated. Example: "2026-09-29T18:35:43Z"')
    })
    .describe('The created contact custom field definition.');

/**
 * @tags: [write]
 * @tagReason: Creates a new contact custom field definition in the provider account.
 * @pitfalls: Labels must be unique across the account; a duplicate label fails with a 409 conflict. The machine-readable `name` slug is auto-derived from `label`, cannot be chosen directly, and is regenerated if the label is ever renamed, so use `custom_field_id` as the stable identifier for the field. Constant Contact caps custom fields at 100 per account. `choices` is required (non-empty) for "single_select"/"multi_select" types and is ignored for all other types; `metadata.display_type` is required for "single_select"/"multi_select". `type` cannot be changed after creation.
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
                type: input.type,
                ...(input.metadata !== undefined && { metadata: input.metadata }),
                ...(input.choices !== undefined && { choices: input.choices }),
                ...(input.version !== undefined && { version: input.version })
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
            ...(customField.choices !== undefined && { choices: customField.choices }),
            version: customField.version,
            created_at: customField.created_at,
            updated_at: customField.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
