import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Label name. Example: "Urgent"'),
    color: z.string().optional().describe('Label color name or legacy color code. Example: "charcoal"'),
    order: z.number().optional().describe('Custom label order value. Example: 0'),
    is_favorite: z.boolean().optional().describe('Whether the label should be marked as favorite. Example: false')
});

const ProviderLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    order: z.number().optional(),
    is_favorite: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    order: z.number().optional(),
    is_favorite: z.boolean().optional()
});

const action = createAction({
    description: 'Create a personal label.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.todoist.com/api/v1/#create-a-personal-label
            endpoint: '/api/v1/labels',
            data: {
                name: input.name,
                ...(input.color !== undefined && { color: input.color }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.is_favorite !== undefined && { is_favorite: input.is_favorite })
            },
            retries: 3
        });

        const providerLabel = ProviderLabelSchema.parse(response.data);

        return {
            id: providerLabel.id,
            name: providerLabel.name,
            ...(providerLabel.color !== undefined && { color: providerLabel.color }),
            ...(providerLabel.order !== undefined && { order: providerLabel.order }),
            ...(providerLabel.is_favorite !== undefined && { is_favorite: providerLabel.is_favorite })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
