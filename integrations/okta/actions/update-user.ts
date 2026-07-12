import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The unique ID of the user to update. Example: "00u14y5o7tvvw1qA0698"'),
    profile: z.record(z.string(), z.unknown()).optional().describe('Partial profile fields to merge into the existing user profile.'),
    credentials: z
        .object({
            password: z
                .object({
                    value: z.string()
                })
                .optional()
        })
        .optional()
        .describe('User credentials to update. Only supply when explicitly changing the password.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    status: z.string(),
    created: z.string().nullable().optional(),
    activated: z.string().nullable().optional(),
    statusChanged: z.string().nullable().optional(),
    lastLogin: z.string().nullable().optional(),
    lastUpdated: z.string().nullable().optional(),
    passwordChanged: z.string().nullable().optional(),
    profile: z.record(z.string(), z.unknown()).optional(),
    credentials: z.unknown().optional(),
    type: z
        .object({
            id: z.string().optional()
        })
        .optional(),
    _links: z.unknown().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    created: z.string().optional(),
    activated: z.string().optional(),
    statusChanged: z.string().optional(),
    lastLogin: z.string().optional(),
    lastUpdated: z.string().optional(),
    passwordChanged: z.string().optional(),
    profile: z.record(z.string(), z.unknown()).optional(),
    credentials: z.unknown().optional(),
    type: z
        .object({
            id: z.string().optional()
        })
        .optional(),
    _links: z.unknown().optional()
});

const action = createAction({
    description: 'Update a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.profile !== undefined) {
            data['profile'] = input.profile;
        }

        if (input.credentials !== undefined) {
            data['credentials'] = input.credentials;
        }

        // https://developer.okta.com/docs/reference/api/users/#update-user
        const response = await nango.post({
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}`,
            data,
            retries: 3
        });

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            status: providerUser.status,
            ...(providerUser.created != null && { created: providerUser.created }),
            ...(providerUser.activated != null && { activated: providerUser.activated }),
            ...(providerUser.statusChanged != null && { statusChanged: providerUser.statusChanged }),
            ...(providerUser.lastLogin != null && { lastLogin: providerUser.lastLogin }),
            ...(providerUser.lastUpdated != null && { lastUpdated: providerUser.lastUpdated }),
            ...(providerUser.passwordChanged != null && { passwordChanged: providerUser.passwordChanged }),
            ...(providerUser.profile !== undefined && { profile: providerUser.profile }),
            ...(providerUser.credentials !== undefined && { credentials: providerUser.credentials }),
            ...(providerUser.type !== undefined && { type: providerUser.type }),
            ...(providerUser._links !== undefined && { _links: providerUser._links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
