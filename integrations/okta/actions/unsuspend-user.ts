import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('Okta user ID. Example: "00u14y5oijeYKVDn0698"')
});

const ProviderUserSchema = z
    .object({
        id: z.string(),
        status: z.string().optional(),
        created: z.string().optional(),
        activated: z.string().nullable().optional(),
        statusChanged: z.string().nullable().optional(),
        lastLogin: z.string().nullable().optional(),
        lastUpdated: z.string().optional(),
        passwordChanged: z.string().nullable().optional(),
        profile: z
            .object({
                firstName: z.string().optional(),
                lastName: z.string().optional(),
                email: z.string().optional(),
                login: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    login: z.string().optional()
});

const action = createAction({
    description: 'Return a suspended user to ACTIVE.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.post({
            // https://developer.okta.com/docs/reference/api/users/#unsuspend-user
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/lifecycle/unsuspend`,
            retries: 3
        });

        const getResponse = await nango.get({
            // https://developer.okta.com/docs/reference/api/users/#get-user
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        });

        const providerUser = ProviderUserSchema.parse(getResponse.data);

        return {
            id: providerUser.id,
            ...(providerUser.status !== undefined && { status: providerUser.status }),
            ...(providerUser.profile?.email !== undefined && { email: providerUser.profile.email }),
            ...(providerUser.profile?.firstName !== undefined && { firstName: providerUser.profile.firstName }),
            ...(providerUser.profile?.lastName !== undefined && { lastName: providerUser.profile.lastName }),
            ...(providerUser.profile?.login !== undefined && { login: providerUser.profile.login })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
