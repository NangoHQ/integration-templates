import { createSync } from 'nango';
import { z } from 'zod';

const TagSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    notes: z.string().optional(),
    created_at: z.string().optional(),
    workspace_gid: z.string(),
    permalink_url: z.string().optional()
});

const AsanaTagSchema = z.object({
    gid: z.string(),
    name: z.string(),
    color: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    workspace: z.object({ gid: z.string() }).optional(),
    permalink_url: z.string().nullable().optional()
});

const AsanaWorkspaceSchema = z.object({
    gid: z.string(),
    name: z.string().optional()
});

const MetadataSchema = z.object({
    workspace_ids: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    workspace_index: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync workspace tags.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Tag: TagSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/tags' }],

    exec: async (nango) => {
        let rawMetadata: unknown;
        try {
            rawMetadata = await nango.getMetadata();
        } catch (error) {
            if (!(error instanceof Error) || error.message !== 'Missing mock data for getMetadata') {
                throw error;
            }
        }

        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        const metadata = metadataResult.success ? metadataResult.data : {};
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const startIndex = checkpointResult.success ? checkpointResult.data.workspace_index : 0;
        const hasResumeCheckpoint = checkpointResult.success;

        let workspaceIds: string[] = [];
        if (metadata.workspace_ids && metadata.workspace_ids.length > 0) {
            workspaceIds = metadata.workspace_ids;
        } else {
            // https://developers.asana.com/reference/getworkspaces
            const workspacesResponse = await nango.get({
                endpoint: '/api/1.0/workspaces',
                params: {
                    limit: 100,
                    opt_fields: 'gid,name'
                },
                retries: 3
            });

            const workspacesPayload = z.object({ data: z.unknown() }).safeParse(workspacesResponse.data);
            if (workspacesPayload.success) {
                const workspacesData = z.array(AsanaWorkspaceSchema).safeParse(workspacesPayload.data.data);
                if (workspacesData.success) {
                    workspaceIds = workspacesData.data.map((workspace) => workspace.gid);
                }
            }
        }

        if (workspaceIds.length === 0) {
            await nango.log('No workspaces found to sync tags');
            return;
        }

        // Blocker: the tags endpoint does not support modified_since and tag
        // payloads do not expose a modified_at high-water mark, so this remains
        // a full refresh. We checkpoint by workspace to resume safely.
        if (!hasResumeCheckpoint) {
            await nango.trackDeletesStart('Tag');
        }

        for (let i = startIndex; i < workspaceIds.length; i++) {
            const workspaceGid = workspaceIds[i];
            if (!workspaceGid) {
                continue;
            }

            // https://developers.asana.com/reference/gettagsforworkspace
            for await (const batch of nango.paginate({
                endpoint: `/api/1.0/workspaces/${workspaceGid}/tags`,
                params: {
                    limit: 100,
                    opt_fields: 'gid,name,color,notes,created_at,permalink_url,workspace'
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'offset',
                    cursor_path_in_response: 'next_page.offset',
                    response_path: 'data',
                    limit_name_in_request: 'limit',
                    limit: 100
                },
                retries: 3
            })) {
                const rawBatch = z.array(z.unknown()).safeParse(batch);
                if (!rawBatch.success) {
                    throw new Error(`Invalid tag batch payload: ${rawBatch.error.message}`);
                }
                if (rawBatch.data.length === 0) {
                    continue;
                }

                const tags: z.infer<typeof TagSchema>[] = [];
                for (const item of rawBatch.data) {
                    const parsed = AsanaTagSchema.safeParse(item);
                    if (!parsed.success) {
                        continue;
                    }
                    const tag = parsed.data;
                    tags.push({
                        id: tag.gid,
                        name: tag.name,
                        ...(tag.color != null && { color: tag.color }),
                        ...(tag.notes != null && { notes: tag.notes }),
                        ...(tag.created_at != null && { created_at: tag.created_at }),
                        workspace_gid: tag.workspace?.gid ?? workspaceGid,
                        ...(tag.permalink_url != null && { permalink_url: tag.permalink_url })
                    });
                }

                if (tags.length > 0) {
                    await nango.batchSave(tags, 'Tag');
                }
            }

            await nango.saveCheckpoint({ workspace_index: i + 1 });
        }

        await nango.trackDeletesEnd('Tag');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
