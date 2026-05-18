import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    target_user_id: z.string().describe('The user ID of the user to follow. Example: "2244994945"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            following: z.boolean(),
            pending_follow: z.boolean()
        })
        .optional(),
    errors: z.array(z.object({})).optional()
});

const OutputSchema = z.object({
    following: z.boolean().describe('Whether the follow was successful'),
    pending_follow: z.boolean().describe('Whether the follow is pending (target user has protected account and must accept the request)')
});

const action = createAction({
    description: 'Follow a user from the authenticated account.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/follow-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['follows.write', 'tweet.read', 'users.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me
        const meResponse = await nango.get({
            endpoint: '/2/users/me',
            retries: 3
        });

        const MeResponseSchema = z.object({
            data: z.object({
                id: z.string()
            })
        });
        const meData = MeResponseSchema.parse(meResponse.data);
        const userId = meData.data.id;

        // https://developer.x.com/en/docs/twitter-api/users/follows/api-reference/post-users-source_user_id-following
        const response = await nango.post({
            endpoint: `/2/users/${userId}/following`,
            data: {
                target_user_id: input.target_user_id
            },
            retries: 3
        });

        if (response.status === 429) {
            throw new nango.ActionError({
                type: 'rate_limited',
                message: 'API rate limit exceeded',
                retry_after: response.headers['retry-after']
            });
        }

        if (response.status >= 400) {
            const errorObj = response.data && typeof response.data === 'object' ? response.data : {};
            throw new nango.ActionError({
                type: 'api_error',
                message: 'message' in errorObj && typeof errorObj['message'] === 'string' ? errorObj['message'] : 'Failed to follow user',
                status: response.status,
                errors: 'errors' in errorObj ? errorObj['errors'] : undefined
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        if (!providerData.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from X API: missing data'
            });
        }

        return {
            following: providerData.data.following,
            pending_follow: providerData.data.pending_follow
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
