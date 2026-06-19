import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_name: z.string().describe('Name of the event category. Example: "Conversion"')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: z
        .object({
            id: z.number(),
            name: z.string()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string()
});

const action = createAction({
    description: 'Retrieve an event category from Amplitude taxonomy.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://amplitude.com/docs/apis/analytics/taxonomy
            endpoint: `/api/2/taxonomy/category/${encodeURIComponent(input.category_name)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.success || !parsed.data) {
            const message = parsed.errors?.[0]?.message || 'Category not found';
            throw new nango.ActionError({
                type: 'not_found',
                message,
                category_name: input.category_name
            });
        }

        return {
            id: parsed.data.id,
            name: parsed.data.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
