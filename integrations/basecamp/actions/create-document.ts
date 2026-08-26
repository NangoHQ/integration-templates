import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The Basecamp project (bucket) ID. Example: 48644099'),
        vaultId: z.number().describe('The vault ID under which to create the document. Example: 10239340939'),
        title: z.string().describe('The title of the document.'),
        content: z.string().describe('The body of the document in rich-text HTML.'),
        status: z.enum(['active', 'drafted']).optional().describe('Set to "active" to publish immediately. Omit to create a draft.'),
        visibleToClients: z.boolean().optional().describe('Whether the document is visible to clients when the project has clients enabled.')
    })
    .describe('Input to create a document in a Basecamp vault.');

const CreatorSchema = z.object({
    id: z.number().describe('The unique ID of the creator.'),
    name: z.string().describe('The display name of the creator.'),
    email_address: z.string().nullable().describe('The email address of the creator, or null.')
});

const ParentSchema = z.object({
    id: z.number().describe('The unique ID of the parent vault.'),
    title: z.string().describe('The title of the parent vault.'),
    type: z.string().describe('The record type of the parent, typically "Vault".'),
    url: z.string().describe('The API URL of the parent vault.'),
    app_url: z.string().describe('The Basecamp web app URL of the parent vault.')
});

const BucketSchema = z.object({
    id: z.number().describe('The unique ID of the project bucket.'),
    name: z.string().describe('The name of the project bucket.'),
    type: z.string().describe('The record type of the bucket, typically "Project".')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the created document.'),
        status: z.string().describe('The status of the document, e.g. "active" or "drafted".'),
        visible_to_clients: z.boolean().describe('Whether the document is visible to clients.'),
        created_at: z.string().describe('ISO 8601 timestamp of creation.'),
        updated_at: z.string().describe('ISO 8601 timestamp of last update.'),
        title: z.string().describe('The document title.'),
        content: z.string().describe('The document body in rich-text HTML.'),
        type: z.string().describe('The record type, typically "Document".'),
        url: z.string().describe('The API URL of the document.'),
        app_url: z.string().describe('The Basecamp web app URL of the document.'),
        parent: ParentSchema.describe('The vault containing this document.'),
        bucket: BucketSchema.describe('The project (bucket) containing this document.'),
        creator: CreatorSchema.describe('The person who created this document.')
    })
    .describe('The created Basecamp document record.');

/**
 * @tags: [write]
 * @tagReason: Creates a new document in a Basecamp vault.
 * @pitfalls: Documents default to drafts when status is omitted; pass "active" to publish immediately. The provider normalizes submitted HTML, so the returned content may differ slightly from the input.
 */
const action = createAction({
    description: 'Create a document in a vault.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://github.com/basecamp/bc3-api/blob/master/sections/documents.md#create-a-document
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/vaults/${encodeURIComponent(String(input.vaultId))}/documents.json`,
            data: {
                title: input.title,
                content: input.content,
                ...(input.status !== undefined && { status: input.status }),
                ...(input.visibleToClients !== undefined && { visible_to_clients: input.visibleToClients })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'The provider did not return a document body.'
            });
        }

        const doc = OutputSchema.parse(response.data);
        return doc;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
