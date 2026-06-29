import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the Coda doc. Example: "L_hgEASd6n"'),
    limit: z.number().optional().describe('Maximum number of results to return. Example: 10'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PageReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    browserLink: z.string(),
    name: z.string()
});

const IconSchema = z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    browserLink: z.string().optional()
});

const ImageSchema = z.object({
    browserLink: z.string().optional(),
    type: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional()
});

const PersonValueSchema = z.object({
    '@context': z.string().optional(),
    '@type': z.string().optional(),
    additionalType: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional()
});

const ProviderPageSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    name: z.string(),
    isHidden: z.boolean(),
    isEffectivelyHidden: z.boolean(),
    browserLink: z.string(),
    children: z.array(PageReferenceSchema),
    contentType: z.string(),
    subtitle: z.string().optional(),
    icon: IconSchema.optional(),
    image: ImageSchema.optional(),
    parent: PageReferenceSchema.optional(),
    authors: z.array(PersonValueSchema).optional(),
    createdAt: z.string().optional(),
    createdBy: PersonValueSchema.optional(),
    updatedAt: z.string().optional(),
    updatedBy: PersonValueSchema.optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderPageSchema),
    href: z.string().optional(),
    nextPageToken: z.string().optional(),
    nextPageLink: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderPageSchema),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'List all pages in a doc.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['doc:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Pages/operation/listPages
            endpoint: `/docs/${encodeURIComponent(input.docId)}/pages`,
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor !== undefined && { pageToken: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        return {
            items: providerResponse.items,
            ...(providerResponse.nextPageToken !== undefined && { nextPageToken: providerResponse.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
