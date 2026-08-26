import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Project (bucket) ID that owns the document. Example: "48644099"'),
        documentId: z.string().describe('Document ID to update. Example: "10239436305"'),
        title: z.string().optional().describe('New document title. Omit to keep the current title.'),
        content: z.string().optional().describe('New document body content. Omit to keep the current content.')
    })
    .describe('Input for updating a Basecamp document.');

const OutputSchema = z
    .object({
        id: z.string().describe('Document ID.'),
        status: z.string().describe('Document status, e.g. "active" or "drafted".'),
        created_at: z.string().describe('ISO 8601 creation timestamp.'),
        updated_at: z.string().describe('ISO 8601 last-update timestamp.'),
        title: z.string().describe('Document title.'),
        content: z.string().describe('Document body content.'),
        type: z.string().describe('Basecamp type constant.'),
        url: z.string().describe('API URL for this document.'),
        app_url: z.string().describe('Basecamp app URL for this document.'),
        comments_count: z.number().describe('Number of comments on this document.'),
        comments_url: z.string().describe("API URL for this document's comments."),
        position: z.number().describe('Position within the parent vault.'),
        parent: z
            .object({
                id: z.string().describe('Parent vault ID.'),
                title: z.string().describe('Parent vault title.'),
                type: z.string().describe('Basecamp type constant.'),
                url: z.string().describe('API URL for the parent vault.'),
                app_url: z.string().describe('Basecamp app URL for the parent vault.')
            })
            .describe('Parent vault containing this document.'),
        bucket: z
            .object({
                id: z.string().describe('Project (bucket) ID.'),
                name: z.string().describe('Project name.'),
                type: z.string().describe('Basecamp type constant.')
            })
            .describe('Project (bucket) that owns this document.'),
        creator: z
            .object({
                id: z.string().describe('Creator person ID.'),
                name: z.string().describe('Creator name.'),
                email_address: z.string().nullable().optional().describe('Creator email address, if exposed by the provider.')
            })
            .describe('Person who created this document.')
    })
    .describe('Output of an updated Basecamp document.');

const ProviderDocumentSchema = z.object({
    id: z.number(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    content: z.string(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    comments_count: z.number(),
    comments_url: z.string(),
    position: z.number(),
    parent: z.object({
        id: z.number(),
        title: z.string(),
        type: z.string(),
        url: z.string(),
        app_url: z.string()
    }),
    bucket: z.object({
        id: z.number(),
        name: z.string(),
        type: z.string()
    }),
    creator: z.object({
        id: z.number(),
        name: z.string(),
        email_address: z.string().nullable().optional()
    })
});

/**
 * @tags: [write]
 * @tagReason: Updates the title and/or content of an existing Basecamp document.
 * @pitfalls: This endpoint only updates title and content; a document's draft or active status cannot be changed here and must be managed separately. Basecamp replaces the whole document on PUT, so when either title or content is omitted from input the current document is first fetched to preserve the omitted field.
 */
const action = createAction({
    description: 'Update a document title or content.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let title = input.title;
        let content = input.content;

        if (title === undefined || content === undefined) {
            // Basecamp's PUT replaces the entire document, clearing any field not sent in the
            // request body (verified: omitting title resets it to "Untitled", omitting content
            // clears it to an empty string). Fetch the current document to preserve the field(s)
            // the caller didn't supply.
            const current = await nango.get({
                // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/documents.md
                endpoint: `/buckets/${encodeURIComponent(input.projectId)}/documents/${encodeURIComponent(input.documentId)}.json`,
                retries: 3
            });

            if (current.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Document not found.'
                });
            }

            if (current.status < 200 || current.status >= 300) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: `Unexpected response status ${current.status} from Basecamp.`,
                    status: current.status
                });
            }

            const currentDoc = ProviderDocumentSchema.parse(current.data);
            title = title ?? currentDoc.title;
            content = content ?? currentDoc.content;
        }

        const data = { title, content };

        const response = await nango.put({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/documents.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/documents/${encodeURIComponent(input.documentId)}.json`,
            data,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Document not found.'
            });
        }

        const providerDoc = ProviderDocumentSchema.parse(response.data);

        return {
            id: String(providerDoc.id),
            status: providerDoc.status,
            created_at: providerDoc.created_at,
            updated_at: providerDoc.updated_at,
            title: providerDoc.title,
            content: providerDoc.content,
            type: providerDoc.type,
            url: providerDoc.url,
            app_url: providerDoc.app_url,
            comments_count: providerDoc.comments_count,
            comments_url: providerDoc.comments_url,
            position: providerDoc.position,
            parent: {
                id: String(providerDoc.parent.id),
                title: providerDoc.parent.title,
                type: providerDoc.parent.type,
                url: providerDoc.parent.url,
                app_url: providerDoc.parent.app_url
            },
            bucket: {
                id: String(providerDoc.bucket.id),
                name: providerDoc.bucket.name,
                type: providerDoc.bucket.type
            },
            creator: {
                id: String(providerDoc.creator.id),
                name: providerDoc.creator.name,
                email_address: providerDoc.creator.email_address
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
