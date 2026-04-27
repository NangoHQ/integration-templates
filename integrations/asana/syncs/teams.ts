import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TeamSchema = z.object({
    id: z.string(),
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional(),
    workspace_id: z.string()
});

const CheckpointSchema = z.object({
    workspaceIndex: z.number().int().nonnegative()
});

const MetadataSchema = z.object({
    workspaceIds: z.array(z.string()).optional()
});

const WorkspaceItemSchema = z.object({
    gid: z.string(),
    name: z.string().optional()
});

const WorkspacesResponseSchema = z.object({
    data: z.array(WorkspaceItemSchema)
});

const TeamItemSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional()
});

const sync = createSync({
    description: 'Sync teams for workspaces in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/teams'
        }
    ],
    models: {
        Team: TeamSchema
    },
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const workspaceIndex = parsedCheckpoint.success ? parsedCheckpoint.data.workspaceIndex : 0;
        const hasResumeCheckpoint = parsedCheckpoint.success;

        let metadataRaw: unknown;
        try {
            metadataRaw = await nango.getMetadata();
        } catch (error) {
            if (!(error instanceof Error) || error.message !== 'Missing mock data for getMetadata') {
                throw error;
            }
        }

        const parsedMetadata = MetadataSchema.safeParse(metadataRaw);
        let workspaceIds = parsedMetadata.success ? parsedMetadata.data.workspaceIds : undefined;

        if (!workspaceIds || workspaceIds.length === 0) {
            // https://developers.asana.com/reference/getworkspaces
            const workspacesResponse = await nango.get({
                endpoint: '/api/1.0/workspaces',
                params: {
                    limit: 100,
                    opt_fields: 'gid,name'
                },
                retries: 3
            });

            const parsedWorkspaces = WorkspacesResponseSchema.safeParse(workspacesResponse.data);
            if (!parsedWorkspaces.success) {
                await nango.log('Failed to parse workspaces response');
                return;
            }

            workspaceIds = parsedWorkspaces.data.data.filter((workspace) => workspace.name !== 'Personal Projects').map((workspace) => workspace.gid);
        }

        if (!workspaceIds || workspaceIds.length === 0) {
            await nango.log('No workspace IDs available to sync teams');
            return;
        }

        // Blocker: the teams endpoint only supports pagination, so we keep a
        // workspace checkpoint to resume a full refresh safely.
        if (!hasResumeCheckpoint) {
            await nango.trackDeletesStart('Team');
        }

        const startIndex = workspaceIndex ?? 0;

        for (let i = startIndex; i < workspaceIds.length; i++) {
            const workspaceId = workspaceIds[i];

            const proxyConfig: ProxyConfiguration = {
                // https://developers.asana.com/reference/getteamsforworkspace
                endpoint: `/api/1.0/workspaces/${workspaceId}/teams`,
                params: {
                    limit: 100
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
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const teams = [];

                for (const raw of page) {
                    const parsed = TeamItemSchema.safeParse(raw);
                    if (!parsed.success) {
                        continue;
                    }

                    const record = parsed.data;
                    teams.push({
                        id: record.gid,
                        gid: record.gid,
                        ...(record.name != null && { name: record.name }),
                        ...(record.resource_type != null && { resource_type: record.resource_type }),
                        workspace_id: workspaceId
                    });
                }

                if (teams.length > 0) {
                    await nango.batchSave(teams, 'Team');
                }
            }

            await nango.saveCheckpoint({
                workspaceIndex: i + 1
            });
        }

        await nango.trackDeletesEnd('Team');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
