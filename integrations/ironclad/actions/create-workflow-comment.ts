import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('Workflow ID. Example: "6a6b328004308879e7d439b6"'),
    comment: z.string().describe('Comment text to post. Example: "This is a test comment"')
});

const ProviderAuthorSchema = z.object({
    type: z.string(),
    displayName: z.string(),
    email: z.string(),
    userId: z.string(),
    companyName: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    author: ProviderAuthorSchema,
    timestamp: z.string(),
    commentMessage: z.string(),
    mentionedUserDetails: z.array(z.unknown()),
    addedParticipants: z.array(z.unknown()),
    reactions: z.array(z.unknown())
});

const OutputSchema = z.object({
    id: z.string(),
    author: z
        .object({
            type: z.string(),
            displayName: z.string(),
            email: z.string(),
            userId: z.string(),
            companyName: z.string()
        })
        .optional(),
    timestamp: z.string().optional(),
    commentMessage: z.string().optional(),
    mentionedUserDetails: z.array(z.unknown()).optional(),
    addedParticipants: z.array(z.unknown()).optional(),
    reactions: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Post a comment on a workflow',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.createComments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ironcladapp.com/reference/create-a-comment-on-a-workflow
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/comments`,
            data: {
                comment: input.comment
            },
            retries: 3
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            author: providerComment.author,
            timestamp: providerComment.timestamp,
            commentMessage: providerComment.commentMessage,
            mentionedUserDetails: providerComment.mentionedUserDetails,
            addedParticipants: providerComment.addedParticipants,
            reactions: providerComment.reactions
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
