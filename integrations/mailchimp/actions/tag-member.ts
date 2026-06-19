import { createHash } from 'crypto';
import { z } from 'zod';
import { createAction } from 'nango';

const TagSchema = z.object({
    name: z.string().describe('The name of the tag. Example: "VIP"'),
    status: z.enum(['active', 'inactive']).describe('Use "active" to add the tag, "inactive" to remove it.')
});

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the list. Example: "a1b2c3d4e5"'),
    email: z.string().describe('The email address of the list member. Example: "user@example.com"'),
    tags: z.array(TagSchema).describe('Tags to add or remove on the member.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Add or remove tags on a Mailchimp list member.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const subscriberHash = createHash('md5').update(input.email.toLowerCase()).digest('hex');

        // https://mailchimp.com/developer/marketing/api/list-member-tags/post-list-member-tags/
        const response = await nango.post({
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}/members/${encodeURIComponent(subscriberHash)}/tags`,
            data: {
                tags: input.tags
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'The list or member was not found.'
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Mailchimp returned ${response.status} when updating tags.`,
                provider_response: response.data
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
