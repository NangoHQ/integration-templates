import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('Application ID. Example: "0oa14y5qldjOIAGrc698"'),
    userId: z.string().describe('User ID to assign. Example: "00u14y5n6uhI2lpQ3698"'),
    scope: z.string().optional().describe('Assignment scope. Defaults to "USER".')
});

const ProviderAppUserSchema = z.object({
    id: z.string(),
    scope: z.string(),
    status: z.string(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    credentials: z
        .object({
            userName: z.string().optional()
        })
        .optional(),
    profile: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    scope: z.string(),
    status: z.string(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    userName: z.string().optional()
});

const action = createAction({
    description: 'Assign a user to an application.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/apps/#assign-user-to-application
            endpoint: `/api/v1/apps/${encodeURIComponent(input.appId)}/users`,
            data: {
                id: input.userId,
                scope: input.scope ?? 'USER'
            },
            retries: 1
        });

        const providerUser = ProviderAppUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            scope: providerUser.scope,
            status: providerUser.status,
            ...(providerUser.created !== undefined && { created: providerUser.created }),
            ...(providerUser.lastUpdated !== undefined && { lastUpdated: providerUser.lastUpdated }),
            ...(providerUser.credentials?.userName !== undefined && { userName: providerUser.credentials.userName })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
