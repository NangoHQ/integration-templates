import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_property: z.string().describe('The user property name. Prefix custom user properties with gp:. Example: "device_id"'),
    show_deleted: z.boolean().optional().describe('Include deleted user properties in the response.')
});

const ProviderUserPropertySchema = z.object({
    user_property: z.string(),
    description: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    enum_values: z.string().nullable().optional(),
    regex: z.string().nullable().optional(),
    is_array_type: z.boolean().optional(),
    is_hidden: z.boolean().optional(),
    classifications: z.array(z.string()).optional(),
    deleted: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: ProviderUserPropertySchema,
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    user_property: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    enum_values: z.string().optional(),
    regex: z.string().optional(),
    is_array_type: z.boolean().optional(),
    is_hidden: z.boolean().optional(),
    classifications: z.array(z.string()).optional(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a user property in taxonomy.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api_key'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://amplitude.com/docs/apis/analytics/taxonomy#get-a-user-property
            endpoint: `/api/2/taxonomy/user-property/${encodeURIComponent(input.user_property)}`,
            params: {
                ...(input.show_deleted !== undefined && { showDeleted: String(input.show_deleted) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse provider response',
                details: parsed.error.issues
            });
        }

        const providerResponse = parsed.data;

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'not_found',
                message: providerResponse.errors?.[0]?.message || 'User property not found'
            });
        }

        const data = providerResponse.data;

        return {
            user_property: data.user_property,
            ...(data.description != null && { description: data.description }),
            ...(data.type != null && { type: data.type }),
            ...(data.enum_values != null && { enum_values: data.enum_values }),
            ...(data.regex != null && { regex: data.regex }),
            ...(data.is_array_type !== undefined && { is_array_type: data.is_array_type }),
            ...(data.is_hidden !== undefined && { is_hidden: data.is_hidden }),
            ...(data.classifications !== undefined && { classifications: data.classifications }),
            ...(data.deleted !== undefined && { deleted: data.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
