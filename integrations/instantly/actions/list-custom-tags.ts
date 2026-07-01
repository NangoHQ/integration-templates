import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderCustomTagSchema = z.object({
    id: z.string(),
    label: z.string(),
    color: z.string().optional(),
    organization_id: z.string()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderCustomTagSchema)
});

const OutputTagSchema = z.object({
    id: z.string(),
    label: z.string(),
    color: z.string().optional(),
    organization_id: z.string()
});

const OutputSchema = z.object({
    items: z.array(OutputTagSchema)
});

const action = createAction({
    description: 'List custom tags.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/list-custom-tags' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/groups/custom-tag
            endpoint: '/v2/custom-tags',
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.items.map((item) => ({
                id: item.id,
                label: item.label,
                ...(item.color !== undefined && { color: item.color }),
                organization_id: item.organization_id
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
