import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    label_id: z.string().describe('The ID of the personal label to update. Example: "2184371051"'),
    name: z.string().optional().describe('New name for the label.'),
    color: z.string().optional().describe('New color for the label.'),
    order: z.number().optional().describe('New order index for the label.'),
    is_favorite: z.boolean().optional().describe('Whether the label should be marked as favorite.')
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
    description: "Update a personal label's name, color, order, or favorite flag.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.color !== undefined) {
            data['color'] = input.color;
        }
        if (input.order !== undefined) {
            data['order'] = input.order;
        }
        if (input.is_favorite !== undefined) {
            data['is_favorite'] = input.is_favorite;
        }

        // https://developer.todoist.com/api/v1/#update-a-label
        const response = await nango.post({
            endpoint: `/api/v1/labels/${encodeURIComponent(input.label_id)}`,
            data,
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
