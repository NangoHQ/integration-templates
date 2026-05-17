import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    target: z.string().describe('The URN of the post or comment to unlike. Example: "urn:li:share:123" or "urn:li:ugcPost:123"'),
    actorUrn: z.string().describe('The URN of the actor (person or organization) who created the like. Example: "urn:li:person:123"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    target: z.string(),
    actorUrn: z.string()
});

const action = createAction({
    description: 'Remove a LinkedIn like from a post or comment.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-like',
        group: 'Social Actions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_member_social_feed', 'w_organization_social_feed'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/network-update-social-actions#delete-a-like
            endpoint: `/v2/socialActions/${encodeURIComponent(input.target)}/likes/${encodeURIComponent(input.actorUrn)}`,
            params: {
                actor: input.actorUrn
            },
            headers: {
                'Linkedin-Version': '202604',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            retries: 1
        };

        const response = await nango.delete(config);

        if (response.status !== 204 && response.status !== 200) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete like. Status: ${response.status}`,
                target: input.target,
                actorUrn: input.actorUrn
            });
        }

        return {
            success: true,
            target: input.target,
            actorUrn: input.actorUrn
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
