import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    problemId: z.string().describe('Problem ID. Example: "6853744532401203457_1785946260000V2"'),
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from the previous response. Omit for the first page.')
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    createdAtTimestamp: z.number(),
    content: z.string(),
    authorName: z.string(),
    context: z.string().optional()
});

const ProviderResponseSchema = z.object({
    totalCount: z.number(),
    pageSize: z.number().optional(),
    nextPageKey: z.string().nullable().optional(),
    comments: z.array(ProviderCommentSchema.passthrough())
});

const OutputSchema = z.object({
    comments: z.array(
        z.object({
            id: z.string(),
            createdAtTimestamp: z.number(),
            content: z.string(),
            authorName: z.string(),
            context: z.string().optional()
        })
    ),
    totalCount: z.number(),
    nextPageKey: z.string().optional()
});

const action = createAction({
    description: 'List comments on a problem.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['problems.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Dynatrace rejects continuation requests that include any parameter besides nextPageKey.
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems-v2/problems-api#get-problem-comments
            endpoint: `/api/v2/problems/${encodeURIComponent(input.problemId)}/comments`,
            params: {
                ...(input.cursor !== undefined && { nextPageKey: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            comments: providerResponse.comments.map((comment) => ({
                id: comment.id,
                createdAtTimestamp: comment.createdAtTimestamp,
                content: comment.content,
                authorName: comment.authorName,
                ...(comment.context !== undefined && { context: comment.context })
            })),
            totalCount: providerResponse.totalCount,
            ...(providerResponse.nextPageKey != null && { nextPageKey: providerResponse.nextPageKey })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
