import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_property: z.string().describe('Name of the group property. Prefix custom group properties with grp:.'),
    group_type: z.string().optional().describe('Name of the group type the group property belongs to.'),
    override_scope: z.string().optional().describe('Determines how Amplitude acts on this group property. Values: "override", "shared".'),
    description: z.string().optional().describe('Description of the group property.'),
    new_group_property_value: z.string().optional().describe('The new name of the group property.'),
    type: z.string().optional().describe('Data type of the group property. Values: any, string, number, boolean, enum.'),
    regex: z.string().optional().describe('Regular expression for pattern matching. Applies only to string type.'),
    enum_values: z.string().optional().describe('List of allowed values, separated by comma. Only applicable to enum type.'),
    is_array_type: z.boolean().optional().describe('Property is an array type.'),
    is_hidden: z.boolean().optional().describe('Hide the property from chart dropdowns.'),
    classifications: z.string().optional().describe('List of classifications applicable to this group property. Valid values: PII, SENSITIVE, REVENUE.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const action = createAction({
    description: 'Update a group property in taxonomy.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-group-property',
        group: 'Taxonomy'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['taxonomy'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams();
        if (input.group_type !== undefined) {
            body.append('group_type', input.group_type);
        }
        if (input.override_scope !== undefined) {
            body.append('overrideScope', input.override_scope);
        }
        if (input.description !== undefined) {
            body.append('description', input.description);
        }
        if (input.new_group_property_value !== undefined) {
            body.append('new_group_property_value', input.new_group_property_value);
        }
        if (input.type !== undefined) {
            body.append('type', input.type);
        }
        if (input.regex !== undefined) {
            body.append('regex', input.regex);
        }
        if (input.enum_values !== undefined) {
            body.append('enum_values', input.enum_values);
        }
        if (input.is_array_type !== undefined) {
            body.append('is_array_type', String(input.is_array_type));
        }
        if (input.is_hidden !== undefined) {
            body.append('is_hidden', String(input.is_hidden));
        }
        if (input.classifications !== undefined) {
            body.append('classifications', input.classifications);
        }

        // @allowTryCatch The Amplitude Taxonomy API returns 4xx status codes with error details in the response body.
        // The Nango proxy throws on non-2xx, so we catch it and return the parsed error payload so the action can surface the real API response.
        try {
            const response = await nango.put({
                // https://amplitude.com/docs/apis/analytics/taxonomy
                endpoint: `/api/2/taxonomy/group-property/${encodeURIComponent(input.group_property)}`,
                data: body.toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                retries: 3
            });

            const responseSchema = z.object({
                success: z.boolean(),
                errors: z.array(z.object({ message: z.string() })).optional()
            });

            const parsed = responseSchema.parse(response.data);
            return parsed;
        } catch (error) {
            if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object') {
                const responseData = 'data' in error.response ? error.response.data : undefined;
                const errorSchema = z.object({
                    success: z.boolean(),
                    errors: z.array(z.object({ message: z.string() })).optional()
                });
                const parsedError = errorSchema.safeParse(responseData);
                if (parsedError.success) {
                    return parsedError.data;
                }
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
