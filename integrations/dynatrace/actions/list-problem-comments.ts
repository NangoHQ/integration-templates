import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    problemId: z.string().describe('The ID of the problem to list comments for. Example: "-8606659165870343936_1785774900000V2"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    content: z.string(),
    createdAtTimestamp: z.number(),
    authorName: z.string(),
    context: z.string()
});

const ProviderCommentsListSchema = z.object({
    comments: z.array(ProviderCommentSchema),
    totalCount: z.number(),
    nextPageKey: z.string().nullable().optional(),
    pageSize: z.number().optional()
});

const OutputSchema = z.object({
    comments: z.array(
        z.object({
            id: z.string(),
            content: z.string(),
            createdAtTimestamp: z.number(),
            authorName: z.string(),
            context: z.string()
        })
    ),
    totalCount: z.number(),
    nextPageKey: z.string().optional()
});

const action = createAction({
    description: 'List comments on a problem.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['problems.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems-v2/comments/get-all
            endpoint: `/api/v2/problems/${encodeURIComponent(input.problemId)}/comments`,
            params: {
                ...(input.cursor !== undefined && { nextPageKey: input.cursor })
            },
            retries: 3
        });

        const providerData = ProviderCommentsListSchema.parse(response.data);

        return {
            comments: providerData.comments,
            totalCount: providerData.totalCount,
            ...(providerData.nextPageKey != null && { nextPageKey: providerData.nextPageKey })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
