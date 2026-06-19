import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_property: z.string().describe('The group property name. Prefix custom group properties with grp:. Example: "grp:Plan"'),
    group_type: z.string().optional().describe('Optional name of the group type. When provided, returns the group property associated with this group type.')
});

const ProviderGroupPropertySchema = z.object({
    group_type: z.string().nullable().optional(),
    group_property: z.string(),
    description: z.string().nullable(),
    type: z.string().nullable(),
    enum_values: z.string().nullable(),
    regex: z.string().nullable(),
    is_array_type: z.boolean(),
    is_hidden: z.boolean(),
    classifications: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    group_property: z.string(),
    group_type: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    enum_values: z.string().optional(),
    regex: z.string().optional(),
    is_array_type: z.boolean(),
    is_hidden: z.boolean(),
    classifications: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Retrieve a group property in taxonomy.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://amplitude.com/docs/apis/analytics/taxonomy
            endpoint: `/api/2/taxonomy/group-property/${encodeURIComponent(input.group_property)}`,
            params: {
                ...(input.group_type !== undefined && { group_type: input.group_type })
            },
            retries: 3
        });

        const envelope = z
            .object({
                success: z.boolean(),
                data: z.unknown()
            })
            .parse(response.data);

        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Amplitude returned a failure response',
                response: response.data
            });
        }

        if (!envelope.data || (typeof envelope.data === 'object' && envelope.data !== null && Object.keys(envelope.data).length === 0)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group property not found',
                group_property: input.group_property
            });
        }

        const providerData = ProviderGroupPropertySchema.parse(envelope.data);

        return {
            group_property: providerData.group_property,
            ...(providerData.group_type != null && { group_type: providerData.group_type }),
            ...(providerData.description != null && { description: providerData.description }),
            ...(providerData.type != null && { type: providerData.type }),
            ...(providerData.enum_values != null && { enum_values: providerData.enum_values }),
            ...(providerData.regex != null && { regex: providerData.regex }),
            is_array_type: providerData.is_array_type,
            is_hidden: providerData.is_hidden,
            ...(providerData.classifications !== undefined && { classifications: providerData.classifications })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
