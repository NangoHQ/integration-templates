import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    filter: z.string().optional().describe("OData filter expression to filter applications. Example: displayName eq 'MyApp'"),
    select: z.string().optional().describe('OData select expression to specify which properties to return. Example: id,displayName,appId'),
    top: z.number().optional().describe('Number of items to return in a page (max 999). Example: 50'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ApplicationSchema = z.object({
    id: z.string(),
    appId: z.string().optional(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    signInAudience: z.string().nullable().optional(),
    publisherDomain: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    identifierUris: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    applications: z.array(
        z.object({
            id: z.string(),
            appId: z.string().optional(),
            displayName: z.string().optional(),
            description: z.string().optional(),
            signInAudience: z.string().optional(),
            publisherDomain: z.string().optional(),
            createdDateTime: z.string().optional(),
            identifierUris: z.array(z.string()).optional()
        })
    ),
    nextCursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const action = createAction({
    description: 'List applications from Microsoft Graph API',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-applications',
        group: 'Applications'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Application.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.filter) {
            params['$filter'] = input.filter;
        }

        if (input.select) {
            params['$select'] = input.select;
        }

        if (input.top) {
            params['$top'] = input.top;
        }

        let response;
        if (input.cursor) {
            // https://learn.microsoft.com/en-us/graph/api/application-list
            response = await nango.get({ endpoint: input.cursor, retries: 3 });
        } else {
            // https://learn.microsoft.com/en-us/graph/api/application-list
            response = await nango.get({ endpoint: '/v1.0/applications', params, retries: 3 });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        const applications = providerData.value.map((item: unknown) => {
            const app = ApplicationSchema.parse(item);
            return {
                id: app.id,
                ...(app.appId !== undefined && { appId: app.appId }),
                ...(app.displayName != null && { displayName: app.displayName }),
                ...(app.description != null && { description: app.description }),
                ...(app.signInAudience != null && { signInAudience: app.signInAudience }),
                ...(app.publisherDomain != null && { publisherDomain: app.publisherDomain }),
                ...(app.createdDateTime != null && { createdDateTime: app.createdDateTime }),
                ...(app.identifierUris !== undefined && { identifierUris: app.identifierUris })
            };
        });

        return {
            applications,
            ...(providerData['@odata.nextLink'] !== undefined && { nextCursor: providerData['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
