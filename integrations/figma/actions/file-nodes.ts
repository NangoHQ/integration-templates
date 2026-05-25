import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    team_id: z.string()
});

const CheckpointSchema = z.object({
    data: z.string()
});

const FileNodeSchema = z.object({
    id: z.string(),
    file_key: z.string(),
    file_name: z.string().optional(),
    node_id: z.string(),
    name: z.string().optional(),
    type: z.string(),
    last_modified: z.string()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProjectsResponseSchema = z.object({
    name: z.string().optional(),
    projects: z.array(ProjectSchema)
});

const FileSchema = z.object({
    key: z.string(),
    name: z.string(),
    thumbnail_url: z.string().optional(),
    last_modified: z.string().optional()
});

const ProjectFilesResponseSchema = z.object({
    name: z.string().optional(),
    files: z.array(FileSchema)
});

const NodeSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string(),
    children: z.array(z.unknown()).optional()
});

const FileNodesEntrySchema = z.object({
    document: NodeSchema.nullable().optional(),
    components: z.record(z.string(), z.unknown()).optional(),
    componentSets: z.record(z.string(), z.unknown()).optional(),
    schemaVersion: z.number().optional(),
    styles: z.record(z.string(), z.unknown()).optional()
});

const FileNodesResponseSchema = z.object({
    name: z.string().optional(),
    lastModified: z.string().optional(),
    nodes: z.record(z.string(), FileNodesEntrySchema.nullable())
});

interface FileNode {
    [key: string]: unknown;
    id: string;
    file_key: string;
    file_name?: string;
    node_id: string;
    name?: string;
    type: string;
    last_modified: string;
}

function flattenNode(raw: unknown, fileKey: string, fileName: string | undefined, lastModified: string, out: FileNode[]) {
    const node = NodeSchema.parse(raw);
    out.push({
        id: `${fileKey}:${node.id}`,
        file_key: fileKey,
        ...(fileName != null && { file_name: fileName }),
        ...(node.name != null && { name: node.name }),
        node_id: node.id,
        type: node.type,
        last_modified: lastModified
    });
    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            flattenNode(child, fileKey, fileName, lastModified, out);
        }
    }
}

const sync = createSync({
    description: 'Sync file nodes from Figma.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/file-nodes' }],
    models: {
        FileNode: FileNodeSchema
    },
    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (!metadata || !metadata.team_id) {
            throw new Error('team_id is required in metadata');
        }

        const checkpoint = await nango.getCheckpoint();
        const filesLastModified: Record<string, string> = checkpoint ? JSON.parse(checkpoint.data) : {};

        // https://www.figma.com/developers/api#get-team-projects-endpoint
        const projectsResponse = await nango.get({
            endpoint: `/v1/teams/${encodeURIComponent(metadata.team_id)}/projects`,
            retries: 3
        });

        const projectsData = ProjectsResponseSchema.parse(projectsResponse.data);
        const projects = projectsData.projects;

        for (const project of projects) {
            // https://www.figma.com/developers/api#get-project-files-endpoint
            const filesResponse = await nango.get({
                endpoint: `/v1/projects/${encodeURIComponent(project.id)}/files`,
                retries: 3
            });

            const filesData = ProjectFilesResponseSchema.parse(filesResponse.data);
            const files = filesData.files;

            for (const file of files) {
                const fileCheckpoint = filesLastModified[file.key];
                if (file.last_modified && fileCheckpoint && file.last_modified <= fileCheckpoint) {
                    continue;
                }

                // https://www.figma.com/developers/api#get-file-nodes-endpoint
                const nodesResponse = await nango.get({
                    endpoint: `/v1/files/${encodeURIComponent(file.key)}/nodes`,
                    params: {
                        ids: '0:0'
                    },
                    retries: 3,
                    retryOn: [429]
                });

                const nodesData = FileNodesResponseSchema.parse(nodesResponse.data);
                const lastModified = file.last_modified ?? new Date().toISOString();
                const records: FileNode[] = [];

                const entry = nodesData.nodes['0:0'];
                if (entry && entry.document) {
                    flattenNode(entry.document, file.key, file.name, lastModified, records);
                }

                if (records.length > 0) {
                    await nango.batchSave(records, 'FileNode');
                }

                filesLastModified[file.key] = file.last_modified ?? new Date().toISOString();
            }
        }

        await nango.saveCheckpoint({
            data: JSON.stringify(filesLastModified)
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
