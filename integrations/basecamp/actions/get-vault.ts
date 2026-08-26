import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Project ID that contains the vault.'),
        vaultId: z
            .string()
            .describe(
                'Vault ID. For the top-level vault this comes from the project\'s dock entry where name == "vault". For sub-folders this comes from a prior create-vault-folder.'
            )
    })
    .describe('Input for retrieving a vault.');

const ProviderBucketSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string()
});

const ProviderCreatorSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().nullable(),
    personable_type: z.string()
});

const ProviderParentSchema = z.object({
    id: z.number(),
    title: z.string(),
    type: z.string(),
    url: z.string(),
    app_url: z.string()
});

const ProviderVaultSchema = z.object({
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
    bookmark_url: z.string(),
    position: z.number(),
    bucket: ProviderBucketSchema,
    creator: ProviderCreatorSchema,
    parent: ProviderParentSchema.optional(),
    documents_count: z.number(),
    documents_url: z.string(),
    uploads_count: z.number(),
    uploads_url: z.string(),
    vaults_count: z.number(),
    vaults_url: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier for the vault.'),
        status: z.string().describe('Current status of the vault, e.g. "active" or "trashed".'),
        visible_to_clients: z.boolean().describe('Whether this vault is visible to client users.'),
        created_at: z.string().describe('ISO 8601 timestamp when the vault was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the vault was last updated.'),
        title: z.string().describe('Title of the vault, e.g. "Docs & Files" for the top-level vault.'),
        inherits_status: z.boolean().describe("Whether the vault inherits its parent's status."),
        type: z.string().describe('The record type, always "Vault" for vaults.'),
        url: z.string().describe('API URL for this vault.'),
        app_url: z.string().describe('Basecamp web application URL for this vault.'),
        bookmark_url: z.string().describe("API URL for the current user's bookmark of this vault."),
        position: z.number().describe('Display position within its parent.'),
        bucket: z
            .object({
                id: z.number().describe('Project ID that contains this vault.'),
                name: z.string().describe('Project name.'),
                type: z.string().describe('Bucket type, always "Project".')
            })
            .describe('The project (bucket) that contains this vault.'),
        creator: z
            .object({
                id: z.number().describe('Person ID of the vault creator.'),
                name: z.string().describe('Name of the vault creator.'),
                email_address: z.string().nullable().describe('Email address of the vault creator, or null if the creator has none.'),
                personable_type: z.string().describe('Type of the creator, typically "User".')
            })
            .describe('The person who created this vault.'),
        parent: z
            .object({
                id: z.number().describe('Parent vault ID.'),
                title: z.string().describe('Parent vault title.'),
                type: z.string().describe('Parent type, always "Vault".'),
                url: z.string().describe('API URL for the parent vault.'),
                app_url: z.string().describe('App URL for the parent vault.')
            })
            .optional()
            .describe('Parent vault reference when this vault is a sub-folder.'),
        documents_count: z.number().describe('Number of documents in this vault.'),
        documents_url: z.string().describe('API URL to list documents in this vault.'),
        uploads_count: z.number().describe('Number of uploads in this vault.'),
        uploads_url: z.string().describe('API URL to list uploads in this vault.'),
        vaults_count: z.number().describe('Number of sub-folder vaults in this vault.'),
        vaults_url: z.string().describe('API URL to list sub-folder vaults in this vault.')
    })
    .describe('Output for a retrieved vault.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single vault by ID without making any changes.
 * @pitfalls: The vault tool must be enabled in the project's dock for its top-level vault ID to be discoverable.
 */
const action = createAction({
    description: "Get a project's top-level vault (Docs & Files) or a sub-folder vault.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://github.com/basecamp/bc3-api/blob/master/sections/vaults.md#get-a-vault
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/vaults/${encodeURIComponent(input.vaultId)}.json`,
            retries: 3
        });

        const providerVault = ProviderVaultSchema.parse(response.data);

        return {
            id: providerVault.id,
            status: providerVault.status,
            visible_to_clients: providerVault.visible_to_clients,
            created_at: providerVault.created_at,
            updated_at: providerVault.updated_at,
            title: providerVault.title,
            inherits_status: providerVault.inherits_status,
            type: providerVault.type,
            url: providerVault.url,
            app_url: providerVault.app_url,
            bookmark_url: providerVault.bookmark_url,
            position: providerVault.position,
            bucket: providerVault.bucket,
            creator: providerVault.creator,
            ...(providerVault.parent !== undefined && { parent: providerVault.parent }),
            documents_count: providerVault.documents_count,
            documents_url: providerVault.documents_url,
            uploads_count: providerVault.uploads_count,
            uploads_url: providerVault.uploads_url,
            vaults_count: providerVault.vaults_count,
            vaults_url: providerVault.vaults_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
