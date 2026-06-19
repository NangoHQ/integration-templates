import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_property: z.string().describe('Name of the user property to create. Example: "subscription_tier"'),
    description: z.string().optional().describe('Details about the user property.'),
    type: z.enum(['string', 'number', 'boolean', 'enum', 'any']).optional().describe('Data type of the user property.'),
    regex: z.string().optional().describe('Regular expression for pattern matching. Only applicable to the string type.'),
    enum_values: z.string().optional().describe('Comma-separated list of allowed values. Only applicable to the enum type.'),
    is_array_type: z.boolean().optional().describe('Whether the property value is an array.'),
    is_hidden: z.boolean().optional().describe('Hide the property from chart dropdowns. Can only be set on ingested properties.'),
    classifications: z.string().optional().describe('Comma-separated classifications. Valid values: PII, SENSITIVE, REVENUE.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const action = createAction({
    description: 'Create a user property in taxonomy.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params = new URLSearchParams();
        params.append('user_property', input.user_property);
        if (input.description !== undefined) {
            params.append('description', input.description);
        }
        if (input.type !== undefined) {
            params.append('type', input.type);
        }
        if (input.regex !== undefined) {
            params.append('regex', input.regex);
        }
        if (input.enum_values !== undefined) {
            params.append('enum_values', input.enum_values);
        }
        if (input.is_array_type !== undefined) {
            params.append('is_array_type', String(input.is_array_type));
        }
        if (input.is_hidden !== undefined) {
            params.append('is_hidden', String(input.is_hidden));
        }
        if (input.classifications !== undefined) {
            params.append('classifications', input.classifications);
        }

        const response = await nango.post({
            // https://amplitude.com/docs/apis/analytics/taxonomy#create-a-user-property
            endpoint: '/api/2/taxonomy/user-property',
            data: params.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.success) {
            const messages = parsed.errors?.map((error) => error.message).join(', ') || 'Unknown Amplitude API error';
            throw new nango.ActionError({
                type: 'api_error',
                message: messages
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
