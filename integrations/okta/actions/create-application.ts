import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    label: z.string().describe('Display name for the application. Example: "My Bookmark App"'),
    url: z.string().describe('Target URL for the bookmark app. Example: "https://example.com"'),
    name: z.string().optional().describe('Application type name. Defaults to "bookmark"'),
    signOnMode: z.string().optional().describe('Sign-on mode. Defaults to "BOOKMARK"'),
    requestIntegration: z.boolean().optional().describe('Whether to request integration. Defaults to false')
});

const ProviderAppSchema = z.object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    status: z.string(),
    signOnMode: z.string(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    settings: z
        .object({
            app: z
                .object({
                    url: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    status: z.string(),
    signOnMode: z.string(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Create an application (e.g. a bookmark app for basic SSO tiles)',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            name: input.name ?? 'bookmark',
            label: input.label,
            signOnMode: input.signOnMode ?? 'BOOKMARK',
            settings: {
                app: {
                    requestIntegration: input.requestIntegration ?? false,
                    url: input.url
                }
            }
        };

        // https://developer.okta.com/docs/reference/api/apps/#add-application
        const response = await nango.post({
            endpoint: '/api/v1/apps',
            data: body,
            retries: 3
        });

        const providerApp = ProviderAppSchema.parse(response.data);

        return {
            id: providerApp.id,
            name: providerApp.name,
            label: providerApp.label,
            status: providerApp.status,
            signOnMode: providerApp.signOnMode,
            ...(providerApp.created !== undefined && { created: providerApp.created }),
            ...(providerApp.lastUpdated !== undefined && { lastUpdated: providerApp.lastUpdated }),
            ...(providerApp.settings?.app?.url !== undefined && { url: providerApp.settings.app.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
