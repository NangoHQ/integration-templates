import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the List to modify. Example: "1146654567674912769"'),
    name: z.string().min(1).max(25).optional().describe('The name of the List. Example: "test v2 update list"'),
    description: z.string().max(100).optional().describe('The description of the List. Example: "example update"'),
    private: z.boolean().optional().describe('Determines whether the List should be private.')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            updated: z.boolean()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                detail: z.string().optional(),
                status: z.number().optional(),
                title: z.string().optional(),
                type: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    updated: z.boolean()
});

const action = createAction({
    description: 'Update a list in Twitter/X.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['list.write', 'tweet.read', 'users.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.name === undefined && input.description === undefined && input.private === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of name, description, or private must be provided to update a list.'
            });
        }

        const response = await nango.put({
            // https://developer.x.com/en/docs/twitter-api/lists/manage-lists/api-reference/put-lists-id
            endpoint: `/2/lists/${input.id}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.private !== undefined && { private: input.private })
            },
            retries: 10
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const firstError = parsed.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.title || 'Unknown provider error',
                detail: firstError.detail,
                status: firstError.status
            });
        }

        if (!parsed.data || parsed.data.updated === undefined) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response did not include update confirmation.'
            });
        }

        return {
            updated: parsed.data.updated
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
