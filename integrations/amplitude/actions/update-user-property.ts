import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    user_property: z.string().describe('The user property name. Prefix custom user properties with gp:. Example: "device_id"'),
    new_user_property_value: z.string().optional().describe('New name of the user property type.'),
    description: z.string().optional().describe('Details to add to the user property type.'),
    type: z.enum(['string', 'number', 'boolean', 'enum', 'any']).optional().describe("The user property's data type."),
    regex: z.string().optional().describe('Regular expression or custom regex used for pattern matching.'),
    enum_values: z.string().optional().describe('List of allowed values, separated by comma.'),
    is_array_type: z.boolean().optional().describe('Specifies whether the property value is an array.'),
    is_hidden: z.boolean().optional().describe('Hide the property from chart dropdowns.'),
    classifications: z.string().optional().describe('List of classifications applicable to this user property. Valid values are PII, SENSITIVE and REVENUE.')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Update a user property in taxonomy.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-user-property',
        group: 'Taxonomy'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams();
        if (input.new_user_property_value !== undefined) body.append('new_user_property_value', input.new_user_property_value);
        if (input.description !== undefined) body.append('description', input.description);
        if (input.type !== undefined) body.append('type', input.type);
        if (input.regex !== undefined) body.append('regex', input.regex);
        if (input.enum_values !== undefined) body.append('enum_values', input.enum_values);
        if (input.is_array_type !== undefined) body.append('is_array_type', String(input.is_array_type));
        if (input.is_hidden !== undefined) body.append('is_hidden', String(input.is_hidden));
        if (input.classifications !== undefined) body.append('classifications', input.classifications);

        const config: ProxyConfiguration = {
            // https://amplitude.com/docs/apis/analytics/taxonomy#update-a-user-property
            endpoint: `/api/2/taxonomy/user-property/${encodeURIComponent(input.user_property)}`,
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        };

        const response = await nango.put(config);

        const result = ProviderResponseSchema.parse(response.data);

        if (!result.success) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: result.errors?.[0]?.message || 'Failed to update user property'
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
