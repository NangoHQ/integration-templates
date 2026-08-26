import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket).'),
        vaultId: z.number().describe('The ID of the vault containing the documents.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input for listing documents in a Basecamp vault.');

const CreatorSchema = z
    .object({
        id: z.number().describe('The person ID.'),
        name: z.string().optional().describe('The person name.'),
        email_address: z.string().optional().describe('The person email address.')
    })
    .describe('The creator of a Basecamp document.');

const ParentSchema = z
    .object({
        id: z.number().describe('The parent vault ID.'),
        title: z.string().optional().describe('The parent vault title.'),
        type: z.string().describe('The parent type.')
    })
    .describe('The parent vault of a Basecamp document.');

const BucketSchema = z
    .object({
        id: z.number().describe('The project (bucket) ID.'),
        name: z.string().optional().describe('The project name.'),
        type: z.string().describe('The bucket type.')
    })
    .describe('The project bucket containing a Basecamp document.');

const DocumentSchema = z
    .object({
        id: z.number().describe('The document ID.'),
        status: z.string().describe('The document status (e.g., active, drafted).'),
        visible_to_clients: z.boolean().describe('Whether the document is visible to clients.'),
        created_at: z.string().describe('ISO 8601 timestamp when the document was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the document was last updated.'),
        title: z.string().describe('The document title.'),
        type: z.string().describe('The record type, typically "Document".'),
        url: z.string().describe('API URL for the document.'),
        app_url: z.string().describe('Web app URL for the document.'),
        comments_count: z.number().describe('Number of comments on the document.'),
        comments_url: z.string().describe('API URL for the document comments.'),
        position: z.number().describe('Position of the document within the vault.'),
        parent: ParentSchema.describe('The parent vault.'),
        bucket: BucketSchema.describe('The project (bucket) containing the document.'),
        creator: CreatorSchema.describe('The person who created the document.'),
        content: z.string().optional().describe('The document content in HTML.'),
        content_attachments: z.array(z.unknown()).optional().describe('Embedded attachments in the document.')
    })
    .describe('A document in a Basecamp vault.');

const OutputSchema = z
    .object({
        items: z.array(DocumentSchema).describe('Documents in the vault, one page at a time.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page, if more results exist.')
    })
    .describe('Output containing a page of documents in a Basecamp vault and an optional pagination cursor.');

const ProviderCreatorSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    email_address: z.string().nullable()
});

const ProviderParentSchema = z.object({
    id: z.number(),
    title: z.string().nullable(),
    type: z.string()
});

const ProviderBucketSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    type: z.string()
});

const ProviderDocumentSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    comments_count: z.number(),
    comments_url: z.string(),
    position: z.number(),
    parent: ProviderParentSchema,
    bucket: ProviderBucketSchema,
    creator: ProviderCreatorSchema,
    content: z.string().nullable(),
    content_attachments: z.array(z.unknown()).nullable()
});

/**
 * @tags: [read]
 * @tagReason: This action only reads documents from the Basecamp API.
 * @pitfalls: Draft documents are not returned by this list; only published (active) documents appear. Returns one page at a time; pass the returned `next_cursor` to fetch more.
 */
const action = createAction({
    description: 'List documents in a vault.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://github.com/basecamp/bc3-api/blob/master/sections/documents.md#get-documents
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/vaults/${encodeURIComponent(input.vaultId)}/documents.json`,
            params: {
                ...(input.cursor !== undefined && { page: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const pageData = z.array(ProviderDocumentSchema).parse(response.data);
        const documents = pageData.map((doc) => ({
            id: doc.id,
            status: doc.status,
            visible_to_clients: doc.visible_to_clients,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            title: doc.title,
            type: doc.type,
            url: doc.url,
            app_url: doc.app_url,
            comments_count: doc.comments_count,
            comments_url: doc.comments_url,
            position: doc.position,
            parent: {
                id: doc.parent.id,
                ...(doc.parent.title != null && { title: doc.parent.title }),
                type: doc.parent.type
            },
            bucket: {
                id: doc.bucket.id,
                ...(doc.bucket.name != null && { name: doc.bucket.name }),
                type: doc.bucket.type
            },
            creator: {
                id: doc.creator.id,
                ...(doc.creator.name != null && { name: doc.creator.name }),
                ...(doc.creator.email_address != null && { email_address: doc.creator.email_address })
            },
            ...(doc.content != null && { content: doc.content }),
            ...(doc.content_attachments != null && { content_attachments: doc.content_attachments })
        }));

        const linkHeader = response.headers?.['link'];
        let next_cursor: string | undefined;
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextMatch && nextMatch[1]) {
                const pageMatch = nextMatch[1].match(/[?&]page=([^&]+)/);
                if (pageMatch && pageMatch[1]) {
                    next_cursor = pageMatch[1];
                }
            }
        }

        return {
            items: documents,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
