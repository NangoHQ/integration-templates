import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The unique ID of the user to suspend. Example: "00u14y5n6uhI2lpQ3698"')
});

const ProviderProfileSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    login: z.string().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    status: z.string(),
    created: z.string().optional(),
    activated: z.string().optional(),
    profile: ProviderProfileSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    created: z.string().optional(),
    activated: z.string().optional(),
    profile: z
        .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional(),
            login: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Suspend an active user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.post({
            // https://developer.okta.com/docs/reference/api/users/#suspend-user
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/lifecycle/suspend`,
            retries: 3
        });

        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/users/#get-user
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        });

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            status: providerUser.status,
            ...(providerUser.created !== undefined && { created: providerUser.created }),
            ...(providerUser.activated !== undefined && { activated: providerUser.activated }),
            ...(providerUser.profile !== undefined && {
                profile: {
                    ...(providerUser.profile.firstName !== undefined && { firstName: providerUser.profile.firstName }),
                    ...(providerUser.profile.lastName !== undefined && { lastName: providerUser.profile.lastName }),
                    ...(providerUser.profile.email !== undefined && { email: providerUser.profile.email }),
                    ...(providerUser.profile.login !== undefined && { login: providerUser.profile.login })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
