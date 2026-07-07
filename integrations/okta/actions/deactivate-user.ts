import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00u14y5o7tvvw1qA0698"'),
    sendEmail: z.boolean().optional().describe('Whether to send a deactivation email to the user. Defaults to false.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    status: z.string(),
    created: z.string().optional(),
    activated: z.string().nullable().optional(),
    statusChanged: z.string().nullable().optional(),
    lastLogin: z.string().nullable().optional(),
    lastUpdated: z.string().optional(),
    passwordChanged: z.string().nullable().optional(),
    profile: z.object({}).passthrough().optional(),
    credentials: z.object({}).passthrough().optional()
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
    profile: z.object({}).passthrough().optional(),
    credentials: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Deactivate a user.',
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
            // https://developer.okta.com/docs/reference/api/users/#deactivate-user
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/lifecycle/deactivate`,
            params,
            retries: 10
        });

        const parseResult = ProviderUserSchema.safeParse(response.data);
        if (parseResult.success) {
            const user = parseResult.data;
            return {
                id: user.id,
                status: user.status,
                ...(user.created !== undefined && { created: user.created }),
                ...(user.activated != null && { activated: user.activated }),
                ...(user.statusChanged != null && { statusChanged: user.statusChanged }),
                ...(user.lastLogin != null && { lastLogin: user.lastLogin }),
                ...(user.lastUpdated !== undefined && { lastUpdated: user.lastUpdated }),
                ...(user.passwordChanged != null && { passwordChanged: user.passwordChanged }),
                ...(user.profile !== undefined && { profile: user.profile }),
                ...(user.credentials !== undefined && { credentials: user.credentials })
            };
        }

        return {
            id: input.userId,
            status: 'DEPROVISIONED'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
