import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('The unique identifier of the application to deactivate. Example: "0oa1a2b3c4d5e6f7g8h9"')
});

const ProviderAppSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        label: z.string().optional(),
        status: z.string().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        signOnMode: z.string().optional(),
        features: z.array(z.string()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    label: z.string().optional(),
    status: z.string().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    signOnMode: z.string().optional(),
    features: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Deactivate an application.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.okta.com/docs/reference/api/apps/#deactivate-application
        const response = await nango.post({
            endpoint: `/api/v1/apps/${encodeURIComponent(input.appId)}/lifecycle/deactivate`,
            retries: 3
        });

        const providerApp = ProviderAppSchema.parse(response.data);

        return {
            id: providerApp.id ?? input.appId,
            ...(providerApp.name !== undefined && { name: providerApp.name }),
            ...(providerApp.label !== undefined && { label: providerApp.label }),
            ...(providerApp.status !== undefined && { status: providerApp.status }),
            ...(providerApp.created !== undefined && { created: providerApp.created }),
            ...(providerApp.lastUpdated !== undefined && { lastUpdated: providerApp.lastUpdated }),
            ...(providerApp.signOnMode !== undefined && { signOnMode: providerApp.signOnMode }),
            ...(providerApp.features !== undefined && { features: providerApp.features })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
