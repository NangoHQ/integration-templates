import { z } from 'zod';
import { createAction } from 'nango';

const MessageAttributeValueSchema = z
    .object({
        organization: z
            .object({
                organization: z.string()
            })
            .optional(),
        person: z
            .object({
                person: z.string()
            })
            .optional()
    })
    .optional();

const MessageAttributeSchema = z.object({
    length: z.number(),
    start: z.number(),
    value: MessageAttributeValueSchema
});

const InputSchema = z.object({
    target: z.string().describe('The URN of the share, ugcPost, or comment to comment on. Example: "urn:li:ugcPost:123"'),
    actor: z.string().describe('The URN of the entity authoring the comment. Example: "urn:li:person:abc" or "urn:li:organization:123"'),
    object: z.string().describe('The URN of the top-level share or ugcPost that contains the comment. Example: "urn:li:activity:123"'),
    message: z.object({
        text: z.string().describe('The comment text.'),
        attributes: z.array(MessageAttributeSchema).optional().describe('Mention attributes in the comment text.')
    }),
    parentComment: z.string().optional().describe('For nested comments, the URN of the parent comment. Example: "urn:li:comment:(urn:li:activity:123,456)"')
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    commentUrn: z.string().optional(),
    actor: z.string().optional(),
    agent: z.string().optional(),
    object: z.string().optional(),
    message: z
        .object({
            text: z.string().optional(),
            attributes: z.array(z.unknown()).optional()
        })
        .optional(),
    created: z
        .object({
            actor: z.string().optional(),
            impersonator: z.string().optional(),
            time: z.number().optional()
        })
        .optional(),
    lastModified: z
        .object({
            actor: z.string().optional(),
            impersonator: z.string().optional(),
            time: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    commentUrn: z.string().optional(),
    actor: z.string().optional(),
    agent: z.string().optional(),
    object: z.string().optional(),
    message: z
        .object({
            text: z.string().optional(),
            attributes: z.array(z.unknown()).optional()
        })
        .optional(),
    created: z
        .object({
            actor: z.string().optional(),
            impersonator: z.string().optional(),
            time: z.number().optional()
        })
        .optional(),
    lastModified: z
        .object({
            actor: z.string().optional(),
            impersonator: z.string().optional(),
            time: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a comment on a LinkedIn post or comment thread.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_organization_social_feed', 'w_member_social_feed'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/network-update-social-actions#create-comment
            endpoint: `/v2/socialActions/${encodeURIComponent(input.target)}/comments`,
            data: {
                actor: input.actor,
                object: input.object,
                message: input.message,
                ...(input.parentComment !== undefined && { parentComment: input.parentComment })
            },
            headers: {
                'Linkedin-Version': '202604',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            retries: 1
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            ...(providerComment.commentUrn !== undefined && { commentUrn: providerComment.commentUrn }),
            ...(providerComment.actor !== undefined && { actor: providerComment.actor }),
            ...(providerComment.agent !== undefined && { agent: providerComment.agent }),
            ...(providerComment.object !== undefined && { object: providerComment.object }),
            ...(providerComment.message !== undefined && {
                message: {
                    ...(providerComment.message.text !== undefined && { text: providerComment.message.text }),
                    ...(providerComment.message.attributes !== undefined && { attributes: providerComment.message.attributes })
                }
            }),
            ...(providerComment.created !== undefined && { created: providerComment.created }),
            ...(providerComment.lastModified !== undefined && { lastModified: providerComment.lastModified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
