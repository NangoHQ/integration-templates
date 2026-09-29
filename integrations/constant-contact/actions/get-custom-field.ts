import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        custom_field_id: z.string().describe('The unique ID of the contact custom field to retrieve. Example: "597d1a10-a0a2-11ec-b909-0242ac120002"')
    })
    .describe('Input for retrieving a single contact custom field definition');

const OutputSchema = z
    .object({
        custom_field_id: z.string().describe('The unique ID of the contact custom field'),
        label: z.string().describe('The display label of the custom field'),
        name: z.string().describe('The machine-generated name slug of the custom field, derived from the label'),
        type: z.string().describe('The data type of the custom field value. Possible values: "string", "date"'),
        created_at: z.string().describe('ISO 8601 timestamp of when the custom field was created. Example: "2021-01-21T18:05:31Z"'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the custom field was last updated. Example: "2021-01-21T18:05:31Z"')
    })
    .describe('A contact custom field definition');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single contact custom field definition without mutating any provider state.
 * @pitfalls: Renaming a custom field's label regenerates its machine name slug, so the returned name can change over time; use custom_field_id as the only stable identifier.
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
