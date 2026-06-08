import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "hostname, guid1, guid2"'),
    listId: z.string().describe('SharePoint list ID. Example: "list-guid"'),
    contentTypeId: z.string().optional().describe('Content type ID to add. Provide this or contentTypeUrl. Example: "0x0100D7B64D4E96D446B8B27A7FB63C94B3E2"'),
    contentTypeUrl: z
        .string()
        .optional()
        .describe(
            'Full content type URL to add. Provide this or contentTypeId. Example: "https://graph.microsoft.com/v1.0/sites/{siteId}/contentTypes/{contentTypeId}"'
        )
});

const ProviderContentTypeSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        group: z.string().optional(),
        parentId: z.string().optional(),
        hidden: z.boolean().optional(),
        readOnly: z.boolean().optional(),
        sealed: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    group: z.string().optional(),
    parentId: z.string().optional(),
    hidden: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    sealed: z.boolean().optional()
});

const action = createAction({
    description: 'Associate a content type with a SharePoint list.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-content-type-to-list',
        group: 'Content Types'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All', 'Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.contentTypeId && !input.contentTypeUrl) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either contentTypeId or contentTypeUrl is required.'
            });
        }

        const contentTypeRef =
            input.contentTypeUrl ||
            `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(input.siteId)}/contentTypes/${encodeURIComponent(input.contentTypeId || '')}`;

        const response = await nango.post({
            // https://learn.microsoft.com/graph/api/contenttype-addcopy
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/contentTypes/addCopy`,
            data: {
                contentType: contentTypeRef
            },
            retries: 3
        });

        const providerContentType = ProviderContentTypeSchema.parse(response.data);

        return {
            ...(providerContentType.id !== undefined && { id: providerContentType.id }),
            ...(providerContentType.name !== undefined && { name: providerContentType.name }),
            ...(providerContentType.description !== undefined && { description: providerContentType.description }),
            ...(providerContentType.group !== undefined && { group: providerContentType.group }),
            ...(providerContentType.parentId !== undefined && { parentId: providerContentType.parentId }),
            ...(providerContentType.hidden !== undefined && { hidden: providerContentType.hidden }),
            ...(providerContentType.readOnly !== undefined && { readOnly: providerContentType.readOnly }),
            ...(providerContentType.sealed !== undefined && { sealed: providerContentType.sealed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
