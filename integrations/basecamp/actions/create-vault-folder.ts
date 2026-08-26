import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('Project (bucket) ID that contains the parent vault.'),
        vaultId: z.number().describe('Parent vault ID where the new folder will be created.'),
        title: z.string().describe('Title of the new vault folder.')
    })
    .describe('Input for creating a sub-folder inside a Basecamp vault.');

const ProviderVaultSchema = z
    .object({
        id: z.number(),
        status: z.string(),
        visible_to_clients: z.boolean(),
        created_at: z.string(),
        updated_at: z.string(),
        title: z.string(),
        inherits_status: z.boolean(),
        type: z.string(),
        url: z.string(),
        app_url: z.string(),
        bookmark_url: z.string().optional(),
        position: z.number(),
        parent: z
            .object({
                id: z.number(),
                title: z.string(),
                type: z.string(),
                url: z.string(),
                app_url: z.string()
            })
            .passthrough()
            .optional(),
        bucket: z
            .object({
                id: z.number(),
                name: z.string(),
                type: z.string()
            })
            .passthrough(),
        creator: z
            .object({
                id: z.number(),
                name: z.string(),
                email_address: z.string()
            })
            .passthrough()
            .optional(),
        documents_count: z.number(),
        documents_url: z.string(),
        uploads_count: z.number(),
        uploads_url: z.string(),
        vaults_count: z.number(),
        vaults_url: z.string()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the created vault folder.'),
        status: z.string().describe('Current status of the vault, e.g. "active".'),
        visible_to_clients: z.boolean().describe('Whether the vault is visible to client users.'),
        created_at: z.string().describe('ISO 8601 timestamp when the vault was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the vault was last updated.'),
        title: z.string().describe('Title of the vault folder.'),
        inherits_status: z.boolean().describe('Whether the vault inherits its parent status.'),
        type: z.string().describe('Basecamp type, always "Vault" for vault folders.'),
        url: z.string().describe('API URL for the vault.'),
        app_url: z.string().describe('Basecamp web app URL for the vault.'),
        bookmark_url: z.string().optional().describe('Bookmark API URL for the vault.'),
        position: z.number().describe('Display position among sibling vaults.'),
        parent: z
            .object({
                id: z.number().describe('ID of the parent vault.'),
                title: z.string().describe('Title of the parent vault.'),
                type: z.string().describe('Basecamp type of the parent vault.'),
                url: z.string().describe('API URL of the parent vault.'),
                app_url: z.string().describe('Basecamp web app URL of the parent vault.')
            })
            .optional()
            .describe('Parent vault information, if nested under another vault.'),
        bucket: z
            .object({
                id: z.number().describe('Project (bucket) ID.'),
                name: z.string().describe('Project name.'),
                type: z.string().describe('Basecamp type, always "Project".')
            })
            .describe('Project (bucket) that contains this vault.'),
        creator: z
            .object({
                id: z.number().describe('Person ID of the creator.'),
                name: z.string().describe('Display name of the creator.'),
                email_address: z.string().describe('Email address of the creator.')
            })
            .optional()
            .describe('Person who created the vault.'),
        documents_count: z.number().describe('Number of documents inside this vault.'),
        documents_url: z.string().describe('API URL to list documents in this vault.'),
        uploads_count: z.number().describe('Number of uploads inside this vault.'),
        uploads_url: z.string().describe('API URL to list uploads in this vault.'),
        vaults_count: z.number().describe('Number of child vaults (sub-folders) inside this vault.'),
        vaults_url: z.string().describe('API URL to list child vaults in this vault.')
    })
    .describe('The newly created vault folder returned by the Basecamp API.');

/**
 * @tags: [write]
 * @tagReason: Creates a new vault folder by posting to the Basecamp API.
 */
const action = createAction({
    description: 'Create a sub-folder inside a vault.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://github.com/basecamp/bc3-api/blob/master/sections/vaults.md#create-a-vault
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/vaults/${encodeURIComponent(input.vaultId)}/vaults.json`,
            data: {
                title: input.title
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'The Basecamp API returned an empty response when creating the vault folder.'
            });
        }

        const vault = ProviderVaultSchema.parse(response.data);

        return {
            id: vault.id,
            status: vault.status,
            visible_to_clients: vault.visible_to_clients,
            created_at: vault.created_at,
            updated_at: vault.updated_at,
            title: vault.title,
            inherits_status: vault.inherits_status,
            type: vault.type,
            url: vault.url,
            app_url: vault.app_url,
            ...(vault.bookmark_url !== undefined && { bookmark_url: vault.bookmark_url }),
            position: vault.position,
            ...(vault.parent !== undefined && {
                parent: {
                    id: vault.parent.id,
                    title: vault.parent.title,
                    type: vault.parent.type,
                    url: vault.parent.url,
                    app_url: vault.parent.app_url
                }
            }),
            bucket: {
                id: vault.bucket.id,
                name: vault.bucket.name,
                type: vault.bucket.type
            },
            ...(vault.creator !== undefined && {
                creator: {
                    id: vault.creator.id,
                    name: vault.creator.name,
                    email_address: vault.creator.email_address
                }
            }),
            documents_count: vault.documents_count,
            documents_url: vault.documents_url,
            uploads_count: vault.uploads_count,
            uploads_url: vault.uploads_url,
            vaults_count: vault.vaults_count,
            vaults_url: vault.vaults_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
