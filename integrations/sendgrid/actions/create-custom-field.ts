import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the custom field. Example: "plan_tier"'),
    field_type: z.enum(['Text', 'Number', 'Date']).describe('Type of the custom field.')
});

const ProviderFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    field_type: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    field_type: z.string()
});

const action = createAction({
    description: 'Create a custom contact field definition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.twilio.com/docs/sendgrid/api-reference/custom-fields/create-custom-field
            endpoint: '/v3/marketing/field_definitions',
            data: {
                name: input.name,
                field_type: input.field_type
            },
            retries: 3
        });

        const providerField = ProviderFieldSchema.parse(response.data);

        return {
            id: providerField.id,
            name: providerField.name,
            field_type: providerField.field_type
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
