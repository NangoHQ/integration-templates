import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    target: z.string().describe('Target URN of the share, ugcPost, or comment. Example: "urn:li:ugcPost:7096760097833439232"'),
    commentId: z.string().describe('Comment ID to delete. Example: "7102976128625123328"'),
    actor: z.string().optional().describe('Organization URN when deleting on behalf of an organization. Example: "urn:li:organization:79988552"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a LinkedIn comment by target URN and comment ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_organization_social_feed', 'w_member_social_feed'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.actor) {
            params['actor'] = input.actor;
        }

        const config: Omit<ProxyConfiguration, 'method'> = {
            // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/network-update-social-actions#delete-comment-from-share
            endpoint: `/v2/socialActions/${encodeURIComponent(input.target)}/comments/${encodeURIComponent(input.commentId)}`,
            params,
            headers: {
                'Linkedin-Version': '202604',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            retries: 3
        };

        const response = await nango.delete(config);

        return {
            success: response.status === 200 || response.status === 204
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
