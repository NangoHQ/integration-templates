import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meeting_id: z.string().describe('The ID of the live meeting to create the action item for. Example: "abc123"'),
    prompt: z.string().describe('Natural language description of the action item to create. Example: "Follow up with the client about the proposal"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            createLiveActionItem: z
                .object({
                    success: z.boolean()
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                code: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Create a live action item during an active meeting.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/mutation/create-live-action-item
            endpoint: '/graphql',
            data: {
                query: 'mutation CreateLiveActionItem($input: CreateLiveActionItemInput!) { createLiveActionItem(input: $input) { success } }',
                variables: {
                    input: {
                        meeting_id: input.meeting_id,
                        prompt: input.prompt
                    }
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const result = parsed.data?.createLiveActionItem;

        if (!result) {
            const firstError = parsed.errors?.[0];
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError?.message || 'Failed to create live action item.'
            });
        }

        return {
            success: result.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
