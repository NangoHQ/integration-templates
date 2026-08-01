import { z } from 'zod';
import { createAction } from 'nango';

const InternalAuthorSchema = z.object({
    type: z.literal('internalUser'),
    companyName: z.string(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    userId: z.string().optional()
});

const ExternalAuthorSchema = z.object({
    type: z.literal('externalUser'),
    companyName: z.string(),
    displayName: z.string().optional(),
    email: z.string().optional()
});

const IntegrationAuthorSchema = z.object({
    type: z.literal('integration'),
    displayName: z.string()
});

const SystemAuthorSchema = z.object({
    type: z.literal('system'),
    displayName: z.literal('Ironclad')
});

const AuthorSchema = z.union([InternalAuthorSchema, ExternalAuthorSchema, IntegrationAuthorSchema, SystemAuthorSchema]);

const RepliedToSchema = z
    .object({
        item: z.string(),
        itemAuthor: AuthorSchema
    })
    .optional();

const MentionedUserSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    email: z.string()
});

const ReactionSchema = z.object({
    emojiId: z.string(),
    reactors: z.array(AuthorSchema)
});

const CommentSchema = z.object({
    id: z.string(),
    commentMessage: z.string(),
    timestamp: z.string(),
    isExternal: z.boolean().optional(),
    author: AuthorSchema,
    repliedTo: RepliedToSchema,
    mentionedUserDetails: z.array(MentionedUserSchema),
    addedParticipants: z.array(z.string()),
    reactions: z.array(ReactionSchema)
});

const InputSchema = z.object({
    workflowId: z.string().describe('The unique identifier of the workflow. Example: "6a6b328004308879e7d439b6"'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    pageSize: z.number().int().min(1).max(100).optional().describe('Number of results per page. Maximum 100. Defaults to 20.')
});

const ProviderListSchema = z.object({
    page: z.number(),
    pageSize: z.number(),
    count: z.number().optional(),
    list: z.array(z.unknown())
});

const OutputSchema = z.object({
    items: z.array(CommentSchema),
    count: z.number().optional(),
    pageSize: z.number(),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List comments on a workflow.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.readComments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 0;
        const pageSize = input.pageSize ?? 20;

        // https://developer.ironcladapp.com/reference/list-all-comments-in-a-workflow
        const response = await nango.get({
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/comments`,
            params: {
                page: page,
                pageSize: pageSize
            },
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);
        const comments = providerList.list.map((item) => CommentSchema.parse(item));

        const hasMore = providerList.count != null && providerList.count > (providerList.page + 1) * providerList.pageSize;
        const nextCursor = hasMore ? String(providerList.page + 1) : undefined;

        return {
            items: comments,
            count: providerList.count,
            pageSize: providerList.pageSize,
            ...(nextCursor !== undefined && { nextCursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
