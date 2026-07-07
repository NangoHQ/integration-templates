import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('Okta user ID or login/email. Example: "00u14u78lfuUpDWf0698" or "api+dev@nango.dev"')
});

const ProviderUserSchema = z
    .object({
        id: z.string(),
        status: z.string(),
        created: z.string().optional(),
        activated: z.string().nullable().optional(),
        statusChanged: z.string().nullable().optional(),
        lastLogin: z.string().nullable().optional(),
        lastUpdated: z.string().optional(),
        passwordChanged: z.string().nullable().optional(),
        transitioningToStatus: z.string().nullable().optional(),
        profile: z.object({}).passthrough().optional(),
        credentials: z.object({}).passthrough().optional(),
        _links: z.object({}).passthrough().optional()
    })
    .passthrough();

const OutputSchema = ProviderUserSchema;

const action = createAction({
    description: 'Retrieve a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/users/#get-user
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                userId: input.userId
            });
        }

        const user = ProviderUserSchema.parse(response.data);
        return user;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
