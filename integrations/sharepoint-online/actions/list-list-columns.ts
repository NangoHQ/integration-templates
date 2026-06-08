import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "nangodevelopers.sharepoint.com,1d6e1722-9330-4b30-aa92-b73f215d9420,413c102d-9557-4a8d-8a68-bbb499015216"'),
    listId: z.string().describe('SharePoint list ID. Example: "eca0d94a-d37a-46ee-9fa4-340a2e0c39f2"'),
    cursor: z.string().optional().describe('Pagination cursor (the @odata.nextLink URL from the previous response). Omit for the first page.')
});

const ProviderColumnSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        displayName: z.string(),
        description: z.string().optional(),
        columnGroup: z.string().optional(),
        hidden: z.boolean().optional(),
        indexed: z.boolean().optional(),
        readOnly: z.boolean().optional(),
        required: z.boolean().optional(),
        enforceUniqueValues: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    columns: z.array(ProviderColumnSchema),
    nextLink: z.string().optional().describe('The @odata.nextLink URL for the next page of results, if any.')
});

const action = createAction({
    description: 'List columns on a SharePoint list.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-list-columns',
        group: 'Columns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = `/v1.0/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/columns`;
        let params: Record<string, string> | undefined;
        if (input.cursor) {
            const cursorUrl = new URL(input.cursor);
            endpoint = cursorUrl.pathname;
            params = {};
            for (const [key, value] of cursorUrl.searchParams.entries()) {
                params[key] = value;
            }
        }

        // https://learn.microsoft.com/graph/api/list-list-columns
        const response = await nango.get({
            endpoint,
            ...(params !== undefined ? { params } : {}),
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'The provider returned an empty response.'
            });
        }

        const ProviderResponseSchema = z.object({
            value: z.array(ProviderColumnSchema),
            '@odata.nextLink': z.string().optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            columns: providerResponse.value,
            ...(providerResponse['@odata.nextLink'] != null ? { nextLink: providerResponse['@odata.nextLink'] } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
