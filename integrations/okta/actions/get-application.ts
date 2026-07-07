import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('Application ID. Example: "0oa14y5qldjOIAGrc698"')
});

const OutputSchema = z.object({
    id: z.string().describe('Application ID. Example: "0oa14y5qldjOIAGrc698"'),
    name: z.string().describe('Application name. Example: "bookmark"'),
    label: z.string().describe('User-facing label. Example: "Nango Test Bookmark App"'),
    status: z.string().describe('Application status. Example: "ACTIVE"'),
    created: z.string().describe('Creation timestamp in ISO 8601 format.').optional(),
    lastUpdated: z.string().describe('Last update timestamp in ISO 8601 format.').optional(),
    signOnMode: z.string().describe('Sign-on mode. Example: "BOOKMARK"').optional(),
    features: z.array(z.string()).optional(),
    accessibility: z.record(z.string(), z.unknown()).optional(),
    visibility: z.record(z.string(), z.unknown()).optional(),
    credentials: z.record(z.string(), z.unknown()).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    profile: z.record(z.string(), z.unknown()).optional(),
    links: z.record(z.string(), z.unknown()).optional()
});

const ProviderApplicationSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        label: z.string(),
        status: z.string(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        signOnMode: z.string().optional(),
        features: z.array(z.string()).optional(),
        accessibility: z.record(z.string(), z.unknown()).optional(),
        visibility: z.record(z.string(), z.unknown()).optional(),
        credentials: z.record(z.string(), z.unknown()).optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
        profile: z.record(z.string(), z.unknown()).optional(),
        _links: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve an application.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.okta.com/docs/reference/api/apps/#get-application
        const response = await nango.get({
            endpoint: `/api/v1/apps/${encodeURIComponent(input.appId)}`,
            retries: 3
        });

        const providerApp = ProviderApplicationSchema.safeParse(response.data);
        if (!providerApp.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The Okta API returned an unexpected application response shape.',
                parse_errors: providerApp.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
            });
        }

        const app = providerApp.data;

        return {
            id: app.id,
            name: app.name,
            label: app.label,
            status: app.status,
            ...(app.created !== undefined && { created: app.created }),
            ...(app.lastUpdated !== undefined && { lastUpdated: app.lastUpdated }),
            ...(app.signOnMode !== undefined && { signOnMode: app.signOnMode }),
            ...(app.features !== undefined && { features: app.features }),
            ...(app.accessibility !== undefined && { accessibility: app.accessibility }),
            ...(app.visibility !== undefined && { visibility: app.visibility }),
            ...(app.credentials !== undefined && { credentials: app.credentials }),
            ...(app.settings !== undefined && { settings: app.settings }),
            ...(app.profile !== undefined && { profile: app.profile }),
            ...(app._links !== undefined && { links: app._links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
