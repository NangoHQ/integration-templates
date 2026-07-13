import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The unique ID of the label to update. Example: 7'),
    name: z.string().optional(),
    color: z.string().optional(),
    description: z.string().nullable().optional(),
    archived: z.boolean().optional()
});

const ProviderLabelSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    color: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    archived: z.boolean().nullable().optional(),
    entity_type: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    stats: z.unknown().optional()
});

const OutputSchema = ProviderLabelSchema;

const action = createAction({
    description: 'Update a label.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.shortcut.com/api/rest/v3#Update-Label
            endpoint: `/api/v3/labels/${encodeURIComponent(String(input.id))}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.color !== undefined && { color: input.color }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.archived !== undefined && { archived: input.archived })
            },
            retries: 1
        });

        const label = ProviderLabelSchema.parse(response.data);

        return label;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
