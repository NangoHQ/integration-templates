import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    pagelen: z.number().optional().describe('Number of items per page. Example: 10')
});

const ProviderUserSchema = z
    .object({
        type: z.string().optional(),
        uuid: z.string().optional(),
        nickname: z.string().optional(),
        display_name: z.string().optional(),
        account_id: z.string().optional()
    })
    .passthrough();

const ProviderWorkspaceSchema = z
    .object({
        type: z.string().optional(),
        uuid: z.string().optional(),
        slug: z.string().optional(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderMemberSchema = z
    .object({
        type: z.string().optional(),
        links: z
            .object({
                self: z
                    .object({
                        href: z.string().optional(),
                        name: z.string().optional()
                    })
                    .optional()
            })
            .optional(),
        user: ProviderUserSchema.optional(),
        workspace: ProviderWorkspaceSchema.optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    size: z.number().optional(),
    page: z.number().optional(),
    pagelen: z.number().optional(),
    next: z.string().optional(),
    previous: z.string().optional(),
    values: z.array(ProviderMemberSchema).optional()
});

const MemberSchema = z.object({
    type: z.string().optional(),
    user_uuid: z.string().optional(),
    user_nickname: z.string().optional(),
    user_display_name: z.string().optional(),
    user_account_id: z.string().optional(),
    workspace_uuid: z.string().optional(),
    workspace_slug: z.string().optional(),
    workspace_name: z.string().optional()
});

const OutputSchema = z.object({
    members: z.array(MemberSchema),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List all members of a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { page?: string | number; pagelen?: number } = {};
        if (input.cursor !== undefined) {
            params.page = input.cursor;
        }
        if (input.pagelen !== undefined) {
            params.pagelen = input.pagelen;
        }

        const response = await nango.get({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-workspaces-workspace-members-get
            endpoint: `/2.0/workspaces/${encodeURIComponent(input.workspace)}/members`,
            params,
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);

        const members = (data.values || []).map((item) => {
            const user = item.user || {};
            const workspace = item.workspace || {};
            return {
                type: item.type,
                user_uuid: user.uuid,
                user_nickname: user.nickname,
                user_display_name: user.display_name,
                user_account_id: user.account_id,
                workspace_uuid: workspace.uuid,
                workspace_slug: workspace.slug,
                workspace_name: workspace.name
            };
        });

        let next_page: string | undefined;
        if (data.next) {
            const nextUrl = new URL(data.next);
            const page = nextUrl.searchParams.get('page');
            if (page) {
                next_page = page;
            }
        }

        return {
            members,
            ...(next_page !== undefined && { next_page })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
