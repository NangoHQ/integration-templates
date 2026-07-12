import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Label name. Must be unique within the workspace.'),
    color: z.string().optional().describe('Hex color string. Example: "#ff5555"'),
    description: z.string().optional(),
    external_id: z.string().optional().describe('External reference ID.')
});

const ProviderLabelSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    external_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().optional(),
    description: z.string().optional(),
    external_id: z.string().optional()
});

const action = createAction({
    description: 'Create a label.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shortcut.com/api/rest/v3#create-label
            endpoint: '/api/v3/labels',
            data: {
                name: input.name,
                ...(input.color !== undefined && { color: input.color }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.external_id !== undefined && { external_id: input.external_id })
            },
            retries: 1
        });

        const providerLabel = ProviderLabelSchema.parse(response.data);

        return {
            id: providerLabel.id,
            name: providerLabel.name,
            ...(providerLabel.color != null && { color: providerLabel.color }),
            ...(providerLabel.description != null && { description: providerLabel.description }),
            ...(providerLabel.external_id != null && { external_id: providerLabel.external_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
