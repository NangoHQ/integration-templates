import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Category name. Example: "Q3 Goals"'),
    type: z.string().describe('Category type. The only supported value is "milestone".'),
    color: z.string().optional().describe('Hex color string. Example: "#ff0000"'),
    external_id: z.string().optional().describe('External identifier. Example: "ext-123"')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    type: z.string().optional(),
    color: z.string().nullable().optional(),
    external_id: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    type: z.string().optional(),
    color: z.string().optional(),
    external_id: z.string().optional()
});

const action = createAction({
    description: 'Create a category.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            name: input.name,
            type: input.type
        };

        if (input.color !== undefined) {
            requestBody['color'] = input.color;
        }

        if (input.external_id !== undefined) {
            requestBody['external_id'] = input.external_id;
        }

        // https://developer.shortcut.com/api/rest/v3#Create-Category
        const response = await nango.post({
            endpoint: '/api/v3/categories',
            data: requestBody,
            retries: 3
        });

        const providerCategory = ProviderCategorySchema.parse(response.data);

        return {
            id: providerCategory.id,
            ...(providerCategory.name !== undefined && { name: providerCategory.name }),
            ...(providerCategory.type !== undefined && { type: providerCategory.type }),
            ...(providerCategory.color != null && { color: providerCategory.color }),
            ...(providerCategory.external_id != null && { external_id: providerCategory.external_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
