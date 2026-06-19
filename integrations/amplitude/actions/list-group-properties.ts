import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_type: z
        .string()
        .optional()
        .describe(
            'Name of the group type. If present, returns all group properties associated with this group type. If omitted, returns all shared group properties.'
        )
});

const GroupPropertySchema = z.object({
    group_type: z.string().optional(),
    group_property: z.string(),
    description: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    enum_values: z.string().nullable().optional(),
    regex: z.string().nullable().optional(),
    is_array_type: z.boolean().optional(),
    is_hidden: z.boolean().optional(),
    classifications: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(GroupPropertySchema)
});

const action = createAction({
    description: 'List group properties in taxonomy.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://amplitude.com/docs/apis/analytics/taxonomy
            endpoint: '/api/2/taxonomy/group-property',
            params: {
                ...(input.group_type !== undefined && { group_type: input.group_type })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                success: z.boolean(),
                data: z.array(z.unknown())
            })
            .parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Amplitude taxonomy API returned an error.'
            });
        }

        const items = providerResponse.data.map((item: unknown) => {
            const parsed = GroupPropertySchema.parse(item);
            return {
                ...(parsed.group_type !== undefined && { group_type: parsed.group_type }),
                group_property: parsed.group_property,
                ...(parsed.description != null && { description: parsed.description }),
                ...(parsed.type != null && { type: parsed.type }),
                ...(parsed.enum_values != null && { enum_values: parsed.enum_values }),
                ...(parsed.regex != null && { regex: parsed.regex }),
                ...(parsed.is_array_type !== undefined && { is_array_type: parsed.is_array_type }),
                ...(parsed.is_hidden !== undefined && { is_hidden: parsed.is_hidden }),
                ...(parsed.classifications !== undefined && { classifications: parsed.classifications })
            };
        });

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
