import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Budget cost code ID. Example: "6a71e1eccb6ddf6b370e0c34"'),
    code: z.string().max(25).optional().describe('Cost code identifier. Max 25 characters.'),
    name: z.string().min(3).max(150).optional().describe('Cost code name. Min 3, max 150 characters.'),
    description: z.string().optional().describe('Cost code description.')
});

const OutputSchema = z.object({
    id: z.string().describe('The updated budget cost code ID.')
});

const action = createAction({
    description: 'Update an existing budget cost code.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: { code?: string; name?: string; description?: string } = {};

        if (input.code !== undefined) {
            data.code = input.code;
        }

        if (input.name !== undefined) {
            data.name = input.name;
        }

        if (input.description !== undefined) {
            data.description = input.description;
        }

        if (Object.keys(data).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of code, name, or description must be provided to update.'
            });
        }

        // https://api.ingenious.build/reference/v2-update-budget-cost-code-1.md
        await nango.patch({
            endpoint: `/api/v2/pub/budget-cost-codes/${encodeURIComponent(input.id)}`,
            data,
            retries: 10
        });

        return {
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
