import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    postId: z.string().describe('The ID of the Facebook post to delete. Example: "1148671018324630_122098284213327930"')
});

const PageAccountSchema = z.object({
    id: z.string(),
    access_token: z.string()
});

const DeletePostResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a Facebook Page post by post ID',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_manage_posts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
        const pageId = input.postId.split('_')[0];
        let pageAccount: z.infer<typeof PageAccountSchema> | undefined;
        for await (const batch of nango.paginate<z.infer<typeof PageAccountSchema>>({
            endpoint: '/me/accounts',
            params: { fields: 'id,access_token' },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.cursors.after',
                cursor_name_in_request: 'after',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        })) {
            const found = batch.find((p) => p.id === pageId);
            if (found) {
                pageAccount = PageAccountSchema.parse(found);
                break;
            }
        }

        if (!pageAccount) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: `Page with ID ${pageId} not found or not accessible`
            });
        }

        const pageToken = pageAccount.access_token;

        // https://developers.facebook.com/docs/graph-api/reference/post/
        const deleteResponse = await nango.delete({
            endpoint: `/${encodeURIComponent(input.postId)}`,
            params: {
                access_token: pageToken
            },
            retries: 3
        });

        const result = DeletePostResponseSchema.parse(deleteResponse.data);

        return {
            success: result.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
