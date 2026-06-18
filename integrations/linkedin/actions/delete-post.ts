import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    postUrn: z.string().describe('The LinkedIn post URN to delete. Example: "urn:li:share:123456789"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    postUrn: z.string()
});

const action = createAction({
    description: 'Delete a LinkedIn post by post URN',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_organization_social', 'w_member_social'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedPostUrn = encodeURIComponent(input.postUrn);

        // https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api#delete-posts
        const response = await nango.delete({
            endpoint: `/v2/ugcPosts/${encodedPostUrn}`,
            headers: {
                'X-Restli-Protocol-Version': '2.0.0'
            },
            retries: 1
        });

        // LinkedIn returns 204 No Content on successful delete
        // If we get here without an exception, the delete was successful
        return {
            success: response.status === 204 || response.status === 200,
            postUrn: input.postUrn
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
