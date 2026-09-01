import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DocumentSchema = z
    .object({
        id: z.string().describe('Unique identifier for the document'),
        status: z.string().describe('Current status of the document (e.g., active, drafted)'),
        visible_to_clients: z.boolean().describe('Whether the document is visible to clients'),
        created_at: z.string().describe('ISO 8601 timestamp when the document was created'),
        updated_at: z.string().describe('ISO 8601 timestamp when the document was last updated'),
        title: z.string().describe('Title of the document'),
        inherits_status: z.boolean().describe('Whether the document inherits its status from its parent'),
        type: z.string().describe('The type of the record (always Document for this model)'),
        url: z.string().describe('API URL for the document'),
        app_url: z.string().describe('Web app URL for the document'),
        position: z.number().describe('Position of the document within its parent'),
        comments_count: z.number().describe('Number of comments on the document'),
        boosts_count: z.number().describe('Number of boosts on the document'),
        parent: z
            .object({
                id: z.number().describe('Unique identifier for the parent vault'),
                title: z.string().describe('Title of the parent vault'),
                type: z.string().describe('Type of the parent (e.g., Vault)'),
                url: z.string().describe('API URL for the parent vault'),
                app_url: z.string().describe('Web app URL for the parent vault')
            })
            .optional()
            .describe('The parent vault containing this document'),
        bucket: z
            .object({
                id: z.number().describe('Unique identifier for the project bucket'),
                name: z.string().describe('Name of the project'),
                type: z.string().describe('Type of the bucket (e.g., Project)')
            })
            .optional()
            .describe('The project bucket this document belongs to'),
        creator: z
            .object({
                id: z.number().describe('Unique identifier for the creator'),
                name: z.string().describe('Name of the creator'),
                email_address: z.string().describe('Email address of the creator'),
                avatar_url: z.string().describe('Avatar URL of the creator')
            })
            .optional()
            .describe('The person who created this document'),
        content: z.string().optional().describe('HTML content of the document')
    })
    .describe('A Basecamp document stored in a project vault');

const CheckpointSchema = z.object({
    pendingVaults: z.string()
});

const VaultRefSchema = z.object({
    projectId: z.number(),
    vaultId: z.number()
});

const ProviderDocumentSchema = z.object({
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
    position: z.number(),
    comments_count: z.number(),
    boosts_count: z.number(),
    parent: z
        .object({
            id: z.number(),
            title: z.string(),
            type: z.string(),
            url: z.string(),
            app_url: z.string()
        })
        .optional(),
    bucket: z
        .object({
            id: z.number(),
            name: z.string(),
            type: z.string()
        })
        .optional(),
    creator: z
        .object({
            id: z.number(),
            name: z.string().optional(),
            email_address: z.string().nullable().optional(),
            avatar_url: z.string().optional()
        })
        .optional(),
    content: z.string().optional()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    status: z.string(),
    dock: z
        .array(
            z.object({
                id: z.number(),
                title: z.string(),
                name: z.string(),
                enabled: z.boolean(),
                url: z.string(),
                app_url: z.string()
            })
        )
        .optional()
});

const ProviderVaultSchema = z.object({
    id: z.number(),
    status: z.string(),
    title: z.string(),
    type: z.string()
});

function parseVaultQueue(json: string): Array<{ projectId: number; vaultId: number }> {
    const parsed = JSON.parse(json);
    const result = z.array(VaultRefSchema).safeParse(parsed);
    if (!result.success) {
        throw new Error(`Failed to parse checkpoint vault queue: ${result.error.message}`);
    }
    return result.data;
}

const sync = createSync({
    description: 'Sync documents across all known projects vaults including sub-folders',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Document: DocumentSchema
    },

    exec: async (nango) => {
        const projects: Array<{ id: number; vaultId: number }> = [];

        const projectConfig: ProxyConfiguration = {
            // https://github.com/basecamp/bc3-api/blob/master/sections/projects.md#get-projects
            endpoint: '/projects.json',
            retries: 3,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'per_page',
                limit: 100
            }
        };

        for await (const page of nango.paginate(projectConfig)) {
            const rawProjects = z.array(ProviderProjectSchema).safeParse(page);
            if (!rawProjects.success) {
                throw new Error(`Failed to parse projects page: ${rawProjects.error.message}`);
            }
            for (const project of rawProjects.data) {
                const vault = project.dock?.find((d) => d.name === 'vault' && d.enabled);
                if (vault) {
                    projects.push({ id: project.id, vaultId: vault.id });
                }
            }
        }

        const checkpoint = await nango.getCheckpoint();
        let queue: Array<{ projectId: number; vaultId: number }> = [];
        if (checkpoint && typeof checkpoint['pendingVaults'] === 'string') {
            queue = parseVaultQueue(checkpoint['pendingVaults']);
        }
        // An empty queue is either a fresh run or a checkpoint restored from a prior execution
        // that crashed right after persisting its final (empty) checkpoint but before
        // trackDeletesEnd ran. Either way it is untrustworthy on its own, so (re)seed it from
        // the freshly discovered projects rather than let it silently close out delete tracking.
        if (queue.length === 0) {
            for (const project of projects) {
                queue.push({ projectId: project.id, vaultId: project.vaultId });
            }
        }

        // If there is still nothing to crawl (no projects with an enabled vault), skip delete
        // tracking entirely instead of opening and immediately closing an empty window, which
        // would delete every previously synced Document.
        if (queue.length === 0) {
            await nango.clearCheckpoint();
            return;
        }

        await nango.trackDeletesStart('Document');

        const processedVaultIds = new Set<number>();
        while (queue.length > 0) {
            const next = queue.shift();
            if (!next) {
                continue;
            }
            const { projectId, vaultId } = next;
            if (processedVaultIds.has(vaultId)) {
                continue;
            }
            processedVaultIds.add(vaultId);

            const docConfig: ProxyConfiguration = {
                // https://github.com/basecamp/bc3-api/blob/master/sections/documents.md#get-documents
                endpoint: `/buckets/${projectId}/vaults/${vaultId}/documents.json`,
                retries: 3,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'per_page',
                    limit: 100
                }
            };

            for await (const page of nango.paginate(docConfig)) {
                const rawDocs = z.array(ProviderDocumentSchema).safeParse(page);
                if (!rawDocs.success) {
                    throw new Error(`Failed to parse documents page: ${rawDocs.error.message}`);
                }
                const documents = rawDocs.data.map((doc) => ({
                    id: String(doc.id),
                    status: doc.status,
                    visible_to_clients: doc.visible_to_clients,
                    created_at: doc.created_at,
                    updated_at: doc.updated_at,
                    title: doc.title,
                    inherits_status: doc.inherits_status,
                    type: doc.type,
                    url: doc.url,
                    app_url: doc.app_url,
                    position: doc.position,
                    comments_count: doc.comments_count,
                    boosts_count: doc.boosts_count,
                    parent: doc.parent,
                    bucket: doc.bucket,
                    creator: doc.creator
                        ? {
                              id: doc.creator.id,
                              name: doc.creator.name ?? '',
                              email_address: doc.creator.email_address ?? '',
                              avatar_url: doc.creator.avatar_url ?? ''
                          }
                        : undefined,
                    content: doc.content
                }));
                if (documents.length > 0) {
                    await nango.batchSave(documents, 'Document');
                }
            }

            const vaultConfig: ProxyConfiguration = {
                // https://github.com/basecamp/bc3-api/blob/master/sections/vaults.md#get-vaults
                endpoint: `/buckets/${projectId}/vaults/${vaultId}/vaults.json`,
                retries: 3,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'per_page',
                    limit: 100
                }
            };

            for await (const page of nango.paginate(vaultConfig)) {
                const rawVaults = z.array(ProviderVaultSchema).safeParse(page);
                if (!rawVaults.success) {
                    throw new Error(`Failed to parse vaults page: ${rawVaults.error.message}`);
                }
                for (const vault of rawVaults.data) {
                    if (vault.status === 'active') {
                        queue.push({ projectId, vaultId: vault.id });
                    }
                }
            }

            if (queue.length > 0) {
                await nango.saveCheckpoint({
                    pendingVaults: JSON.stringify(queue)
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Document');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
