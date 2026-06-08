import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "contoso.sharepoint.com,00000000-0000-0000-0000-000000000000,00000000-0000-0000-0000-000000000000"'),
    listId: z.string().describe('SharePoint list ID. Example: "00000000-0000-0000-0000-000000000000"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (@odata.nextLink). Omit for the first page.')
});

const BaseContentTypeSchema = z.object({
    id: z.string().optional().nullable(),
    name: z.string().optional().nullable()
});

const ProviderContentTypeSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    group: z.string().optional().nullable(),
    hidden: z.boolean().optional().nullable(),
    isBuiltIn: z.boolean().optional().nullable(),
    readOnly: z.boolean().optional().nullable(),
    sealed: z.boolean().optional().nullable(),
    parentId: z.string().optional().nullable(),
    base: BaseContentTypeSchema.optional().nullable()
});

const ProviderResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional().nullable()
});

const ContentTypeSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    group: z.string().optional(),
    hidden: z.boolean().optional(),
    isBuiltIn: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    sealed: z.boolean().optional(),
    parentId: z.string().optional(),
    base: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(ContentTypeSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List the content types associated with a SharePoint list.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-list-content-types',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const graphBaseUrl = 'https://graph.microsoft.com';
        let endpoint: string;
        if (input.cursor) {
            endpoint = input.cursor.startsWith(graphBaseUrl) ? input.cursor.slice(graphBaseUrl.length) : input.cursor;
        } else {
            endpoint = `/v1.0/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/contentTypes`;
        }

        // https://learn.microsoft.com/graph/api/list-list-contenttypes
        const response = await nango.get({
            endpoint,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.value.map((item: unknown) => {
            const ct = ProviderContentTypeSchema.parse(item);
            return {
                id: ct.id,
                ...(ct.name != null && { name: ct.name }),
                ...(ct.description != null && { description: ct.description }),
                ...(ct.group != null && { group: ct.group }),
                ...(ct.hidden != null && { hidden: ct.hidden }),
                ...(ct.isBuiltIn != null && { isBuiltIn: ct.isBuiltIn }),
                ...(ct.readOnly != null && { readOnly: ct.readOnly }),
                ...(ct.sealed != null && { sealed: ct.sealed }),
                ...(ct.parentId != null && { parentId: ct.parentId }),
                ...(ct.base != null && {
                    base: {
                        ...(ct.base.id != null && { id: ct.base.id }),
                        ...(ct.base.name != null && { name: ct.base.name })
                    }
                })
            };
        });

        const next_cursor = providerResponse['@odata.nextLink'] != null ? providerResponse['@odata.nextLink'] : undefined;

        return {
            items,
            ...(next_cursor != null && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
