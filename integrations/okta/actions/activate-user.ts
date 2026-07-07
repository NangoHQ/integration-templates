import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00u14u78lfuUpDWf0698"'),
    sendEmail: z.boolean().optional().describe('Whether to send an activation email to the user.')
});

const ProviderUserSchema = z
    .object({
        id: z.string(),
        status: z.string(),
        created: z.string().optional(),
        activated: z.string().nullable().optional(),
        statusChanged: z.string().nullable().optional(),
        lastLogin: z.string().nullable().optional(),
        lastUpdated: z.string().nullable().optional(),
        passwordChanged: z.string().nullable().optional(),
        type: z
            .object({
                id: z.string()
            })
            .optional(),
        profile: z.record(z.string(), z.unknown()).optional(),
        credentials: z.record(z.string(), z.unknown()).optional(),
        _links: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    created: z.string().optional(),
    activated: z.string().optional(),
    statusChanged: z.string().optional(),
    lastLogin: z.string().optional(),
    lastUpdated: z.string().optional(),
    passwordChanged: z.string().optional(),
    type: z
        .object({
            id: z.string()
        })
        .optional(),
    profile: z.record(z.string(), z.unknown()).optional(),
    credentials: z.record(z.string(), z.unknown()).optional(),
    _links: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Activate a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.sendEmail !== undefined) {
            params['sendEmail'] = String(input.sendEmail);
        }

        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/users/#activate-user
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/lifecycle/activate`,
            params,
            retries: 3
        });

        let userData = response.data;
        if (!userData || typeof userData !== 'object' || !('id' in userData)) {
            const getResponse = await nango.get({
                // https://developer.okta.com/docs/reference/api/users/#get-user
                endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}`,
                retries: 3
            });
            userData = getResponse.data;
        }

        const providerUser = ProviderUserSchema.parse(userData);

        return {
            id: providerUser.id,
            status: providerUser.status,
            ...(providerUser.created !== undefined && { created: providerUser.created }),
            ...(providerUser.activated != null && { activated: providerUser.activated }),
            ...(providerUser.statusChanged != null && { statusChanged: providerUser.statusChanged }),
            ...(providerUser.lastLogin != null && { lastLogin: providerUser.lastLogin }),
            ...(providerUser.lastUpdated != null && { lastUpdated: providerUser.lastUpdated }),
            ...(providerUser.passwordChanged != null && { passwordChanged: providerUser.passwordChanged }),
            ...(providerUser.type !== undefined && { type: providerUser.type }),
            ...(providerUser.profile !== undefined && { profile: providerUser.profile }),
            ...(providerUser.credentials !== undefined && { credentials: providerUser.credentials }),
            ...(providerUser._links !== undefined && { _links: providerUser._links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
