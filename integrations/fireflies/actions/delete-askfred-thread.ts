import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the AskFred thread to delete. Example: "thread_abc123"')
});

const ProviderOutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    transcript_id: z.string().nullable().optional(),
    user_id: z.string(),
    created_at: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    transcript_id: z.string().optional(),
    user_id: z.string(),
    created_at: z.string()
});

const action = createAction({
    description: 'Delete an AskFred conversation thread and all its messages.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/mutation/delete-askfred-thread
            endpoint: '/graphql',
            data: {
                query: `mutation DeleteAskFredThread($id: String!) {
                    deleteAskFredThread(id: $id) {
                        id
                        title
                        transcript_id
                        user_id
                        created_at
                    }
                }`,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        if (response.data && response.data.errors) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Failed to delete AskFred thread',
                errors: response.data.errors
            });
        }

        const rawData = response.data?.data?.deleteAskFredThread;
        if (!rawData) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Thread not found or deletion failed',
                id: input.id
            });
        }

        const providerOutput = ProviderOutputSchema.parse(rawData);

        return {
            id: providerOutput.id,
            title: providerOutput.title,
            ...(providerOutput.transcript_id != null && { transcript_id: providerOutput.transcript_id }),
            user_id: providerOutput.user_id,
            created_at: providerOutput.created_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
