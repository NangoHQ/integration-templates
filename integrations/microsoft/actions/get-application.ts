import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier for the application. Example: "cc67332f-dfd9-43f0-af0f-bc0ff5334965"')
});

const ProviderApplicationSchema = z.object({
    id: z.string(),
    appId: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    publisherDomain: z.string().nullable().optional(),
    signInAudience: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    appId: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    createdDateTime: z.string().optional(),
    publisherDomain: z.string().optional(),
    signInAudience: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single application from Microsoft.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Application.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/application-get
            endpoint: `/v1.0/applications/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Application not found',
                id: input.id
            });
        }

        const providerApp = ProviderApplicationSchema.parse(response.data);

        return {
            id: providerApp.id,
            ...(providerApp.appId != null && { appId: providerApp.appId }),
            ...(providerApp.displayName != null && { displayName: providerApp.displayName }),
            ...(providerApp.description != null && { description: providerApp.description }),
            ...(providerApp.createdDateTime != null && { createdDateTime: providerApp.createdDateTime }),
            ...(providerApp.publisherDomain != null && { publisherDomain: providerApp.publisherDomain }),
            ...(providerApp.signInAudience != null && { signInAudience: providerApp.signInAudience })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
