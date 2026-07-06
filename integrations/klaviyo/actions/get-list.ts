import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Primary key that uniquely identifies this list. Example: "XW53Ha"')
});

const ProviderListAttributesSchema = z.object({
    name: z.string(),
    created: z.string().optional(),
    updated: z.string().optional(),
    opt_in_process: z.string().optional(),
    profile_count: z.number().optional()
});

const ProviderListDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ProviderListAttributesSchema
});

const ProviderResponseSchema = z.object({
    data: ProviderListDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    created: z.string().optional(),
    updated: z.string().optional(),
    opt_in_process: z.string().optional(),
    profile_count: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lists:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_list
            endpoint: `/api/lists/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const list = parsed.data;

        return {
            id: list.id,
            name: list.attributes.name,
            ...(list.attributes.created !== undefined && { created: list.attributes.created }),
            ...(list.attributes.updated !== undefined && { updated: list.attributes.updated }),
            ...(list.attributes.opt_in_process !== undefined && { opt_in_process: list.attributes.opt_in_process }),
            ...(list.attributes.profile_count !== undefined && { profile_count: list.attributes.profile_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
