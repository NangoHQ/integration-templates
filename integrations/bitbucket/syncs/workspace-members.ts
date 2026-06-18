import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    type: z.string().optional(),
    uuid: z.string().optional(),
    nickname: z.string().optional(),
    display_name: z.string().optional(),
    account_id: z.string().optional()
});

const WorkspaceSchema = z.object({
    type: z.string().optional(),
    uuid: z.string().optional(),
    slug: z.string().optional(),
    name: z.string().optional()
});

const MembershipSchema = z.object({
    type: z.string().optional(),
    user: UserSchema,
    workspace: WorkspaceSchema,
    permission: z.string().optional()
});

const WorkspaceMemberSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    workspace_uuid: z.string().optional(),
    workspace_slug: z.string().optional(),
    workspace_name: z.string().optional(),
    user_uuid: z.string().optional(),
    user_nickname: z.string().optional(),
    user_display_name: z.string().optional(),
    user_account_id: z.string().optional(),
    permission: z.string().optional()
});

const WorkspaceAccessSchema = z.object({
    workspace: z
        .object({
            slug: z.string(),
            uuid: z.string().optional()
        })
        .optional()
});

const WorkspaceMembersResponseSchema = z.object({
    values: z.array(MembershipSchema),
    next: z.string().optional()
});

const CheckpointSchema = z.object({
    workspace_slug: z.string(),
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync members of a workspace',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        WorkspaceMember: WorkspaceMemberSchema
    },
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = checkpoint ? CheckpointSchema.safeParse(checkpoint) : null;
        const resumeWorkspaceSlug = parsedCheckpoint?.success ? parsedCheckpoint.data.workspace_slug : undefined;
        const resumePage = parsedCheckpoint?.success ? parsedCheckpoint.data.page : 1;

        await nango.trackDeletesStart('WorkspaceMember');

        const workspaces: Array<{ slug: string }> = [];
        const workspacesProxyConfig: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-user-workspaces-get
            endpoint: '/2.0/user/workspaces',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pagelen',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        for await (const page of nango.paginate(workspacesProxyConfig)) {
            const items = z.array(WorkspaceAccessSchema).parse(page);
            for (const item of items) {
                if (item.workspace) {
                    workspaces.push({ slug: item.workspace.slug });
                }
            }
        }

        workspaces.sort((a, b) => a.slug.localeCompare(b.slug));

        let startIndex = workspaces.length;
        if (workspaces.length > 0) {
            startIndex = 0;
            if (resumeWorkspaceSlug) {
                startIndex = workspaces.findIndex((workspace) => workspace.slug >= resumeWorkspaceSlug);
                if (startIndex === -1) {
                    startIndex = workspaces.length;
                }
            }
        }

        for (let workspaceIndex = startIndex; workspaceIndex < workspaces.length; workspaceIndex++) {
            const workspace = workspaces[workspaceIndex]!;
            let page = workspace.slug === resumeWorkspaceSlug ? resumePage : 1;

            while (true) {
                // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-workspaces-workspace-members-get
                const response = await nango.get({
                    endpoint: `/2.0/workspaces/${encodeURIComponent(workspace.slug)}/members`,
                    params: {
                        page,
                        pagelen: 100
                    },
                    retries: 3
                });

                const parsedResponse = WorkspaceMembersResponseSchema.parse(response.data);
                const members = parsedResponse.values.map((membership) => {
                    const userUuid = membership.user?.uuid;
                    const workspaceUuid = membership.workspace?.uuid ?? workspace.slug;

                    if (!userUuid) {
                        throw new Error('Workspace membership missing user.uuid');
                    }

                    return {
                        id: `${workspaceUuid}-${userUuid}`,
                        type: membership.type,
                        workspace_uuid: membership.workspace?.uuid,
                        workspace_slug: membership.workspace?.slug,
                        workspace_name: membership.workspace?.name,
                        user_uuid: userUuid,
                        user_nickname: membership.user?.nickname,
                        user_display_name: membership.user?.display_name,
                        user_account_id: membership.user?.account_id,
                        permission: membership.permission
                    };
                });

                if (members.length > 0) {
                    await nango.batchSave(members, 'WorkspaceMember');
                }

                if (parsedResponse.next) {
                    page += 1;
                    await nango.saveCheckpoint({ workspace_slug: workspace.slug, page });
                    continue;
                }

                const nextWorkspace = workspaces[workspaceIndex + 1];
                if (nextWorkspace) {
                    await nango.saveCheckpoint({ workspace_slug: nextWorkspace.slug, page: 1 });
                }

                break;
            }
        }

        await nango.trackDeletesEnd('WorkspaceMember');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
