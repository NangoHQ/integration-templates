import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    label: z.string().describe('Display label for the custom tag. Example: "Important"'),
    color: z.string().optional().describe('Optional hex color string. Example: "#FF6B6B"')
});

const ProviderCustomTagSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    organization_id: z.string(),
    label: z.string(),
    description: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    label: z.string(),
    description: z.string().optional(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    organization_id: z.string().optional()
});

const action = createAction({
    description: 'Create a custom tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/create-custom-tag'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/customtag/create-custom-tag
            endpoint: '/v2/custom-tags',
            data: {
                label: input.label,
                ...(input.color !== undefined && { color: input.color })
            },
            retries: 3
        });

        const providerTag = ProviderCustomTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            label: providerTag.label,
            ...(providerTag.description != null && { description: providerTag.description }),
            ...(providerTag.timestamp_created != null && { timestamp_created: providerTag.timestamp_created }),
            ...(providerTag.timestamp_updated != null && { timestamp_updated: providerTag.timestamp_updated }),
            ...(providerTag.organization_id != null && { organization_id: providerTag.organization_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
