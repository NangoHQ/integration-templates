import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_id: z.number().describe('The ID of the category to update. Example: 412931'),
    category_name: z.string().describe('The new name of the category. Example: "Updated Category"')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Update an event category.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://amplitude.com/docs/apis/analytics/taxonomy
            endpoint: `/api/2/taxonomy/category/${encodeURIComponent(String(input.category_id))}`,
            data: `category_name=${encodeURIComponent(input.category_name)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.errors?.map((e) => e.message).join(', ') || 'Unknown provider error'
            });
        }

        return {
            success: parsed.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
