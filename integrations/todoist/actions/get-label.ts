import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    label_id: z.string().describe('The ID of the personal label to retrieve. Example: "2184371051"')
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
    description: 'Retrieve a single personal label.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.todoist.com/api/v1#get-a-personal-label
        const response = await nango.get({
            endpoint: `/api/v1/labels/${encodeURIComponent(input.label_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Label not found',
                label_id: input.label_id
            });
        }

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
