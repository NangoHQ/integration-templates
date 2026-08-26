import { createSync } from 'nango';
import { z } from 'zod';

function linkPaginate(rel: string): { type: 'link'; link_rel_in_response_header: string } {
    return { type: 'link', link_rel_in_response_header: rel };
}

const CheckpointSchema = z.object({
    pendingVaults: z.string().describe('JSON-encoded queue of remaining { projectId, vaultId } pairs to crawl.')
});

const VaultRefSchema = z.object({
    projectId: z.number(),
    vaultId: z.number()
});

function parsePendingVaults(json: string): Array<z.infer<typeof VaultRefSchema>> {
    return z.array(VaultRefSchema).parse(JSON.parse(json));
}

const DockEntrySchema = z.object({
    id: z.number(),
    name: z.string(),
    enabled: z.boolean(),
    title: z.string(),
    url: z.string(),
    app_url: z.string(),
    position: z.number().nullable().optional()
});

const ProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    dock: z.array(DockEntrySchema)
});

const VaultSchema = z.object({
    id: z.number(),
    status: z.string(),
    title: z.string(),
    type: z.string(),
    vaults_count: z.number().optional(),
    vaults_url: z.string().optional()
});

const ProviderUploadSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    content_type: z.string(),
    byte_size: z.number(),
    filename: z.string(),
    download_url: z.string(),
    app_download_url: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    description: z.string().optional(),
    position: z.number(),
    comments_count: z.number(),
    parent: z.object({
        id: z.number(),
        title: z.string(),
        type: z.string()
    }),
    bucket: z.object({
        id: z.number(),
        name: z.string(),
        type: z.string()
    }),
    creator: z.object({
        id: z.number(),
        name: z.string()
    })
});

const UploadSchema = z
    .object({
        id: z.string().describe('The unique identifier of the upload record.'),
        status: z.string().describe('The publication status of the upload: active, archived, or trashed.'),
        visible_to_clients: z.boolean().describe('Whether the upload is visible to client users on the project.'),
        created_at: z.string().describe('ISO 8601 timestamp when the upload was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the upload was last updated.'),
        title: z.string().describe('The title of the upload, typically the file name.'),
        content_type: z.string().describe('The MIME type of the uploaded file.'),
        byte_size: z.number().describe('The size of the uploaded file in bytes.'),
        filename: z.string().describe('The original file name of the upload.'),
        download_url: z.string().describe('API URL to download the latest version of the file.'),
        app_download_url: z.string().describe('Web-app URL to download the latest version of the file.'),
        width: z.number().optional().describe('Width in pixels for image uploads, if applicable.'),
        height: z.number().optional().describe('Height in pixels for image uploads, if applicable.'),
        description: z.string().optional().describe('HTML description or caption for the upload.'),
        project_id: z.string().describe('The project (bucket) ID that contains this upload.'),
        project_name: z.string().describe('The name of the project that contains this upload.'),
        vault_id: z.string().describe('The vault (folder) ID that contains this upload.'),
        vault_title: z.string().describe('The title of the vault (folder) that contains this upload.'),
        position: z.number().describe('The sort position of the upload within its vault.'),
        comments_count: z.number().describe('The number of comments on this upload.'),
        creator_id: z.string().describe('The ID of the person who created this upload.'),
        creator_name: z.string().describe('The name of the person who created this upload.')
    })
    .describe('A file upload record stored in a Basecamp vault.');

const sync = createSync({
    description: 'Sync file uploads across all known projects vaults including sub-folders.',
    version: '1.0.0',
    frequency: 'every hour',
    checkpoint: CheckpointSchema,
    models: {
        Upload: UploadSchema
    },
    exec: async (nango) => {
        async function discoverVaults(): Promise<Array<z.infer<typeof VaultRefSchema>>> {
            const projectVaults: Array<z.infer<typeof VaultRefSchema>> = [];

            // https://github.com/basecamp/bc3-api/blob/master/sections/projects.md#get-all-projects
            const projectProxyConfig = {
                endpoint: '/projects.json',
                paginate: linkPaginate('next'),
                retries: 3
            };

            for await (const projectsPage of nango.paginate(projectProxyConfig)) {
                const projects = z.array(ProjectSchema).parse(projectsPage);
                for (const project of projects) {
                    const vaultEntry = project.dock.find((entry) => entry.name === 'vault');
                    if (vaultEntry && vaultEntry.enabled) {
                        projectVaults.push({ projectId: project.id, vaultId: vaultEntry.id });
                    }
                }
            }

            return projectVaults;
        }

        const checkpoint = await nango.getCheckpoint();
        let vaultQueue: Array<z.infer<typeof VaultRefSchema>>;

        if (checkpoint != null && typeof checkpoint['pendingVaults'] === 'string') {
            vaultQueue = parsePendingVaults(checkpoint['pendingVaults']);
            // A checkpoint restored with an empty queue is indistinguishable from a prior
            // execution that crashed right after persisting its final (empty) checkpoint but
            // before trackDeletesEnd ran. Treat it as untrustworthy and rediscover from scratch
            // rather than let an empty queue silently close out delete tracking below.
            if (vaultQueue.length === 0) {
                vaultQueue = await discoverVaults();
            }
        } else {
            vaultQueue = await discoverVaults();
        }

        // If there is still nothing to crawl (no projects with an enabled vault), skip delete
        // tracking entirely instead of opening and immediately closing an empty window, which
        // would delete every previously synced Upload.
        if (vaultQueue.length === 0) {
            await nango.clearCheckpoint();
            return;
        }

        const processedVaults = new Set<string>();

        await nango.trackDeletesStart('Upload');

        while (vaultQueue.length > 0) {
            const next = vaultQueue.shift();
            if (!next) {
                continue;
            }

            const { projectId, vaultId } = next;
            const vaultKey = `${projectId}:${vaultId}`;
            if (processedVaults.has(vaultKey)) {
                continue;
            }
            processedVaults.add(vaultKey);

            // https://github.com/basecamp/bc3-api/blob/master/sections/uploads.md#get-uploads
            const uploadProxyConfig = {
                endpoint: `/buckets/${encodeURIComponent(String(projectId))}/vaults/${encodeURIComponent(String(vaultId))}/uploads.json`,
                paginate: linkPaginate('next'),
                retries: 3
            };

            for await (const uploadsPage of nango.paginate(uploadProxyConfig)) {
                const uploads = z.array(ProviderUploadSchema).parse(uploadsPage);
                const records = uploads.map((upload) => ({
                    id: String(upload.id),
                    status: upload.status,
                    visible_to_clients: upload.visible_to_clients,
                    created_at: upload.created_at,
                    updated_at: upload.updated_at,
                    title: upload.title,
                    content_type: upload.content_type,
                    byte_size: upload.byte_size,
                    filename: upload.filename,
                    download_url: upload.download_url,
                    app_download_url: upload.app_download_url,
                    ...(upload.width !== undefined && { width: upload.width }),
                    ...(upload.height !== undefined && { height: upload.height }),
                    ...(upload.description !== undefined && { description: upload.description }),
                    project_id: String(upload.bucket.id),
                    project_name: upload.bucket.name,
                    vault_id: String(upload.parent.id),
                    vault_title: upload.parent.title,
                    position: upload.position,
                    comments_count: upload.comments_count,
                    creator_id: String(upload.creator.id),
                    creator_name: upload.creator.name
                }));

                if (records.length > 0) {
                    await nango.batchSave(records, 'Upload');
                }
            }

            // https://github.com/basecamp/bc3-api/blob/master/sections/vaults.md#get-vaults
            const subVaultProxyConfig = {
                endpoint: `/buckets/${encodeURIComponent(String(projectId))}/vaults/${encodeURIComponent(String(vaultId))}/vaults.json`,
                paginate: linkPaginate('next'),
                retries: 3
            };

            for await (const vaultsPage of nango.paginate(subVaultProxyConfig)) {
                const vaults = z.array(VaultSchema).parse(vaultsPage);
                for (const vault of vaults) {
                    if (vault.type === 'Vault' && vault.status === 'active') {
                        vaultQueue.push({ projectId, vaultId: vault.id });
                    }
                }
            }

            if (vaultQueue.length > 0) {
                await nango.saveCheckpoint({ pendingVaults: JSON.stringify(vaultQueue) });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Upload');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
