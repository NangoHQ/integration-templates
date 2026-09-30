import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        custom_field_id: z.string().describe('The unique ID of the contact custom field to retrieve. Example: "597d1a10-a0a2-11ec-b909-0242ac120002"')
    })
    .describe('Input for retrieving a single contact custom field definition');

const ChoiceSchema = z.object({
    custom_field_id: z.string().optional().describe('ID of the parent custom field this choice belongs to.'),
    choice_id: z.union([z.string(), z.number()]).optional().describe('Unique identifier of the choice. Example: 25242'),
    choice_label: z.string().describe('Display label of the choice. Example: "Gold"'),
    display_order: z.number().optional().describe('Sort order of the choice relative to other choices.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the choice was created.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the choice was last updated.')
});

const OutputSchema = z
    .object({
        custom_field_id: z.string().describe('The unique ID of the contact custom field'),
        label: z.string().describe('The display label of the custom field'),
        name: z.string().describe('The machine-generated name slug of the custom field, derived from the label'),
        type: z
            .string()
            .describe(
                'The data type of the custom field value. Possible values: "string", "date", "datetime", "number", "boolean", "currency", "text_area", "single_select", "multi_select".'
            ),
        version: z.number().describe('Version number of the custom field definition. For "date" type: 1 for legacy string-based dates, 2 for actual date values. Example: 1'),
        metadata: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Additional type-specific metadata, e.g. display_format for date fields, allow_negative/decimal_places/integer for number/currency fields, currency_code for currency fields, or display_type for single_select/multi_select fields.'
            ),
        choices: z
            .array(ChoiceSchema)
            .optional()
            .describe('Selectable options. Present only when type is "single_select" or "multi_select".'),
        created_at: z.string().describe('ISO 8601 timestamp of when the custom field was created. Example: "2021-01-21T18:05:31Z"'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the custom field was last updated. Example: "2021-01-21T18:05:31Z"')
    })
    .describe('A contact custom field definition');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single contact custom field definition without mutating any provider state.
 * @pitfalls: Renaming a custom field's label regenerates its machine name slug, so the returned name can change over time; use custom_field_id as the only stable identifier. `metadata` and `choices` are only meaningfully populated for certain types (e.g. `choices` only for "single_select"/"multi_select").
 */
const action = createAction({
    description: 'Retrieve a single contact custom field definition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://v3.developer.constantcontact.com/api_reference/index.html
        const response = await nango.get({
            endpoint: `/v3/contact_custom_fields/${encodeURIComponent(input.custom_field_id)}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
