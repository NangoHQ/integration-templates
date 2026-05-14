import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).optional().describe('List of user IDs to look up. Up to 100 IDs can be provided. Example: ["2244994945", "783214"]'),
    usernames: z.array(z.string()).optional().describe('List of usernames to look up. Up to 100 usernames can be provided. Example: ["XDevelopers", "X"]'),
    userFields: z
        .array(z.string())
        .optional()
        .describe(
            'Additional user fields to include in the response. Example: ["created_at", "description", "public_metrics", "verified", "location", "profile_image_url"]'
        ),
    expansions: z.array(z.string()).optional().describe('Expansions to include in the response. Example: ["pinned_tweet_id"]')
});

const PublicMetricsSchema = z.object({
    followers_count: z.number().optional(),
    following_count: z.number().optional(),
    tweet_count: z.number().optional(),
    listed_count: z.number().optional()
});

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    created_at: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    profile_image_url: z.string().optional(),
    verified: z.boolean().optional(),
    protected: z.boolean().optional(),
    url: z.string().optional(),
    pinned_tweet_id: z.string().optional(),
    public_metrics: PublicMetricsSchema.optional()
});

const OutputSchema = z.object({
    users: z.array(UserSchema),
    errors: z
        .array(
            z.object({
                value: z.string(),
                detail: z.string().optional(),
                title: z.string().optional(),
                resource_type: z.string().optional(),
                parameter: z.string().optional(),
                resource_id: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'List users from Twitter/X by IDs or usernames',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-users',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.ids && !input.usernames) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either ids or usernames must be provided'
            });
        }

        const params: Record<string, string> = {};

        if (input.ids && input.ids.length > 0) {
            if (input.ids.length > 100) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'Maximum 100 user IDs allowed per request'
                });
            }
            params['ids'] = input.ids.join(',');
        }

        if (input.usernames && input.usernames.length > 0) {
            if (input.usernames.length > 100) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'Maximum 100 usernames allowed per request'
                });
            }
            params['usernames'] = input.usernames.join(',');
        }

        if (input.userFields && input.userFields.length > 0) {
            params['user.fields'] = input.userFields.join(',');
        }

        if (input.expansions && input.expansions.length > 0) {
            params['expansions'] = input.expansions.join(',');
        }

        const endpoint = input.usernames && !input.ids ? '/2/users/by' : '/2/users';

        // https://docs.x.com/x-api/users/get-users-by-ids
        const response = await nango.get({
            endpoint,
            params,
            retries: 3
        });

        if (response.status !== 200 || !response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to fetch users from X API',
                status: response.status
            });
        }

        const ApiErrorSchema = z.object({
            value: z.string().optional(),
            detail: z.string().optional(),
            title: z.string().optional(),
            resource_type: z.string().optional(),
            parameter: z.string().optional(),
            resource_id: z.string().optional()
        });

        const ApiResponseSchema = z.object({
            data: z.array(z.unknown()).optional(),
            errors: z.array(ApiErrorSchema).optional()
        });

        const rawData = ApiResponseSchema.parse(response.data);

        const users: z.infer<typeof UserSchema>[] = [];

        if (rawData.data && Array.isArray(rawData.data)) {
            for (const userData of rawData.data) {
                const parsed = UserSchema.safeParse(userData);
                if (parsed.success) {
                    users.push(parsed.data);
                }
            }
        }

        return {
            users,
            ...(rawData.errors && rawData.errors.length > 0
                ? {
                      errors: rawData.errors.map((err) => ({
                          value: err.value || '',
                          ...(err.detail && { detail: err.detail }),
                          ...(err.title && { title: err.title }),
                          ...(err.resource_type && {
                              resource_type: err.resource_type
                          }),
                          ...(err.parameter && { parameter: err.parameter }),
                          ...(err.resource_id && { resource_id: err.resource_id })
                      }))
                  }
                : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
