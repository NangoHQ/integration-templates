import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    transcript_id: z.string().optional().describe('Filter threads to only those associated with a specific transcript ID. Example: "transcript_xyz789"')
});

const AskFredThreadSummarySchema = z.object({
    id: z.string(),
    title: z.string(),
    created_at: z.string().optional(),
    transcript_id: z.string().optional().nullable(),
    user_id: z.string().optional()
});

const OutputSchema = z.array(AskFredThreadSummarySchema);

const action = createAction({
    description: 'List AskFred AI conversation threads, optionally filtered by transcript.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/query/askfred-threads
            endpoint: '/graphql',
            data: {
                query: `
                    query GetAskFredThreads($transcriptId: String) {
                        askfred_threads(transcript_id: $transcriptId) {
                            id
                            title
                            transcript_id
                            user_id
                            created_at
                        }
                    }
                `,
                variables: {
                    ...(input.transcript_id !== undefined && { transcriptId: input.transcript_id })
                }
            },
            retries: 3
        });

        const threadsData = response.data?.data?.askfred_threads;
        if (!Array.isArray(threadsData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Fireflies API'
            });
        }

        return threadsData.map((thread: unknown) => {
            const parsed = AskFredThreadSummarySchema.parse(thread);
            return {
                id: parsed.id,
                title: parsed.title,
                created_at: parsed.created_at,
                transcript_id: parsed.transcript_id,
                user_id: parsed.user_id
            };
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
