import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_property: z.string().describe('The user property name. Prefix custom user properties with gp:.')
});

const ProviderRestoreResponseSchema = z.object({
    success: z.boolean()
});

const ProviderUserPropertySchema = z.object({
    user_property: z.string(),
    description: z.string().nullable(),
    type: z.string().nullable(),
    enum_values: z.string().nullable(),
    regex: z.string().nullable(),
    is_array_type: z.boolean(),
    is_hidden: z.boolean(),
    classifications: z.array(z.string()),
    deleted: z.boolean()
});

const ProviderGetResponseSchema = z.object({
    success: z.boolean(),
    data: ProviderUserPropertySchema
});

const OutputSchema = z.object({
    success: z.boolean(),
    user_property: z.string().optional(),
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
    description: 'Restore a deleted user property in taxonomy.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://amplitude.com/docs/apis/analytics/taxonomy
        const restoreResponse = await nango.post({
            endpoint: `/api/2/taxonomy/user-property/${encodeURIComponent(input.user_property)}/restore`,
            retries: 3
        });

        const parsedRestore = ProviderRestoreResponseSchema.parse(restoreResponse.data);

        if (!parsedRestore.success) {
            throw new nango.ActionError({
                type: 'restore_failed',
                message: 'Failed to restore user property',
                user_property: input.user_property
            });
        }

        // https://amplitude.com/docs/apis/analytics/taxonomy
        const getResponse = await nango.get({
            endpoint: `/api/2/taxonomy/user-property/${encodeURIComponent(input.user_property)}`,
            retries: 3
        });

        const parsedGet = ProviderGetResponseSchema.parse(getResponse.data);
        const property = parsedGet.data;

        return {
            success: true,
            user_property: property.user_property,
            ...(property.description != null && { description: property.description }),
            ...(property.type != null && { type: property.type }),
            ...(property.enum_values != null && { enum_values: property.enum_values }),
            ...(property.regex != null && { regex: property.regex }),
            is_array_type: property.is_array_type,
            is_hidden: property.is_hidden,
            classifications: property.classifications,
            deleted: property.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
