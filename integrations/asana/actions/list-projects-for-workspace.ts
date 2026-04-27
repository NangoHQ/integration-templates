import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace_gid: z.string().describe('Globally unique identifier for the workspace or organization. Example: "12345"'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Results per page. The number of objects to return per page. The value must be between 1 and 100.'),
    archived: z.boolean().optional().describe('Only return projects whose archived field takes on the value of this parameter.')
});

const WorkspaceCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional()
});

const TeamCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional()
});

const UserCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional()
});

const ProjectSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional(),
    archived: z.boolean().optional(),
    color: z.string().nullable().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    notes: z.string().nullable().optional(),
    owner: UserCompactSchema.nullable().optional(),
    team: TeamCompactSchema.nullable().optional(),
    workspace: WorkspaceCompactSchema.nullable().optional(),
    permalink_url: z.string().optional()
});

const NextPageSchema = z.object({
    offset: z.string(),
    path: z.string().optional(),
    uri: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    next_page: NextPageSchema.nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(ProjectSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List projects in a workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-projects-for-workspace',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            opt_fields: 'gid,resource_type,name,archived,color,created_at,modified_at,notes,owner,team,workspace,permalink_url'
        };

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['offset'] = input.cursor;
        }
        if (input.archived !== undefined) {
            params['archived'] = String(input.archived);
        }

        // https://developers.asana.com/reference/getprojectsforworkspace
        const response = await nango.get({
            endpoint: `/api/1.0/workspaces/${input.workspace_gid}/projects`,
            params: params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item: unknown) => {
            const project = ProjectSchema.parse(item);
            return {
                gid: project.gid,
                resource_type: project.resource_type,
                name: project.name,
                archived: project.archived,
                color: project.color,
                created_at: project.created_at,
                modified_at: project.modified_at,
                notes: project.notes,
                owner: project.owner,
                team: project.team,
                workspace: project.workspace,
                permalink_url: project.permalink_url
            };
        });

        return {
            items: items,
            ...(providerResponse.next_page != null && providerResponse.next_page.offset != null ? { next_cursor: providerResponse.next_page.offset } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
