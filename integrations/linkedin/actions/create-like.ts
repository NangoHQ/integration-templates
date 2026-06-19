import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    target: z.string().describe('The URN of the share, UGC post, or comment to like. Example: "urn:li:share:123"'),
    actor: z.string().describe('The URN of the person or organization performing the like. Example: "urn:li:person:abc"'),
    object: z.string().describe('The URN of the entity to which the like belongs. Example: "urn:li:share:123"')
});

const ProviderCreatedSchema = z.object({
    actor: z.string(),
    time: z.number()
});

const ProviderLastModifiedSchema = z.object({
    actor: z.string(),
    time: z.number()
});

const ProviderLikeSchema = z.object({
    id: z.string().optional(),
    $URN: z.string().optional(),
    actor: z.string(),
    agent: z.string(),
    object: z.string(),
    created: ProviderCreatedSchema,
    lastModified: ProviderLastModifiedSchema
});

const OutputSchema = z.object({
    id: z.string(),
    actor: z.string(),
    agent: z.string(),
    object: z.string(),
    created: z.object({
        actor: z.string(),
        time: z.number()
    }),
    lastModified: z.object({
        actor: z.string(),
        time: z.number()
    })
});

const action = createAction({
    description: 'Like a LinkedIn post or comment as a person or organization.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_member_social_feed', 'w_organization_social_feed'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedTarget = encodeURIComponent(input.target);

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/network-update-social-actions#create-a-like-on-a-share
            endpoint: `/v2/socialActions/${encodedTarget}/likes`,
            data: {
                actor: input.actor,
                object: input.object
            },
            headers: {
                'Linkedin-Version': '202604',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            retries: 3
        });

        const providerLike = ProviderLikeSchema.parse(response.data);
        const likeId = providerLike.id ?? providerLike.$URN;
        if (!likeId) {
            throw new nango.ActionError({
                type: 'missing_id',
                message: 'Like response did not contain an id or $URN'
            });
        }

        return {
            id: likeId,
            actor: providerLike.actor,
            agent: providerLike.agent,
            object: providerLike.object,
            created: {
                actor: providerLike.created.actor,
                time: providerLike.created.time
            },
            lastModified: {
                actor: providerLike.lastModified.actor,
                time: providerLike.lastModified.time
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
