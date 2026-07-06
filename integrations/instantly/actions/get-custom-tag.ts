import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Custom tag ID. Example: "bca10b65-b620-44b3-8571-8ce409ad38c8"')
});

const ProviderCustomTagSchema = z
    .object({
        id: z.string(),
        label: z.string(),
        color: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    label: z.string(),
    color: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a custom tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/groups/custom-tag
            endpoint: `/v2/custom-tags/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Custom tag not found',
                id: input.id
            });
        }

        const providerTag = ProviderCustomTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            label: providerTag.label,
            ...(providerTag.color != null && { color: providerTag.color })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
