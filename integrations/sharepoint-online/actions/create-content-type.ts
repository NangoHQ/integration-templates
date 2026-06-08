import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "nangodevelopers.sharepoint.com,1d6e1722-9330-4b30-aa92-b73f215d9420,413c102d-9557-4a8d-8a68-bbb499015216"'),
    name: z.string().describe('Name of the content type.'),
    description: z.string().optional().describe('Description of the content type.'),
    group: z.string().optional().describe('Group name for the content type.'),
    base: z
        .object({
            id: z.string().describe('Base content type ID. Example: "0x01" for Item, "0x0101" for Document.')
        })
        .optional()
        .describe('Base content type reference. Defaults to Item (0x01) if omitted.')
});

const ProviderContentTypeSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        group: z.string().optional(),
        parentId: z.string().optional(),
        base: z
            .object({
                id: z.string().optional(),
                name: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    group: z.string().optional(),
    parentId: z.string().optional(),
    base: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a content type on a SharePoint site.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-content-type',
        group: 'Content Types'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const baseContentType = input.base ?? { id: '0x01' };

        // https://learn.microsoft.com/graph/api/site-post-contenttypes
        const response = await nango.post({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/contentTypes`,
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.group !== undefined && { group: input.group }),
                base: baseContentType
            },
            retries: 3
        });

        const providerContentType = ProviderContentTypeSchema.parse(response.data);

        return OutputSchema.parse(providerContentType);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
