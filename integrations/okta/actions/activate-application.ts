import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('Application ID. Example: "0oa14y5pvdukQRBPv698"')
});

const ProviderAppSchema = z.object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    status: z.string(),
    created: z.string().optional(),
    lastUpdated: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    label: z.string(),
    status: z.string()
});

const action = createAction({
    description: 'Activate an application.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.post({
            // https://developer.okta.com/docs/reference/api/apps/#activate-application
            endpoint: `/api/v1/apps/${encodeURIComponent(input.appId)}/lifecycle/activate`,
            retries: 3
        });

        const getResponse = await nango.get({
            // https://developer.okta.com/docs/reference/api/apps/#get-application
            endpoint: `/api/v1/apps/${encodeURIComponent(input.appId)}`,
            retries: 3
        });

        const providerApp = ProviderAppSchema.parse(getResponse.data);

        return {
            id: providerApp.id,
            name: providerApp.name,
            label: providerApp.label,
            status: providerApp.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
