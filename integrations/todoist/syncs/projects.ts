import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    parent_id: z.string().nullable().optional(),
    color: z.string().optional(),
    is_archived: z.boolean().optional(),
    is_favorite: z.boolean().optional(),
    view_style: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    description: z.string().optional(),
    is_shared: z.boolean().optional(),
    is_frozen: z.boolean().optional(),
    is_collapsed: z.boolean().optional(),
    child_order: z.number().optional(),
    default_order: z.number().optional(),
    creator_uid: z.string().optional(),
    can_assign_tasks: z.boolean().optional(),
    can_comment: z.boolean().optional(),
    inbox_project: z.boolean().optional()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    parent_id: z.string().optional(),
    color: z.string().optional(),
    is_archived: z.boolean().optional(),
    is_favorite: z.boolean().optional(),
    view_style: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    description: z.string().optional(),
    is_shared: z.boolean().optional(),
    is_frozen: z.boolean().optional(),
    is_collapsed: z.boolean().optional(),
    child_order: z.number().optional(),
    default_order: z.number().optional(),
    creator_uid: z.string().optional(),
    can_assign_tasks: z.boolean().optional(),
    can_comment: z.boolean().optional(),
    inbox_project: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync projects.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Project');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.todoist.com/api/v1/#get-all-projects
            endpoint: '/api/v1/projects',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const projects of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderProjectSchema).safeParse(projects);
            if (!parsed.success) {
                throw new Error(`Failed to parse projects: ${parsed.error.message}`);
            }

            const records = parsed.data.map((project) => ({
                id: project.id,
                name: project.name,
                ...(project.parent_id != null && { parent_id: project.parent_id }),
                ...(project.color && { color: project.color }),
                ...(project.is_archived !== undefined && { is_archived: project.is_archived }),
                ...(project.is_favorite !== undefined && { is_favorite: project.is_favorite }),
                ...(project.view_style && { view_style: project.view_style }),
                ...(project.created_at && { created_at: project.created_at }),
                ...(project.updated_at && { updated_at: project.updated_at }),
                ...(project.description && { description: project.description }),
                ...(project.is_shared !== undefined && { is_shared: project.is_shared }),
                ...(project.is_frozen !== undefined && { is_frozen: project.is_frozen }),
                ...(project.is_collapsed !== undefined && { is_collapsed: project.is_collapsed }),
                ...(project.child_order !== undefined && { child_order: project.child_order }),
                ...(project.default_order !== undefined && { default_order: project.default_order }),
                ...(project.creator_uid && { creator_uid: project.creator_uid }),
                ...(project.can_assign_tasks !== undefined && { can_assign_tasks: project.can_assign_tasks }),
                ...(project.can_comment !== undefined && { can_comment: project.can_comment }),
                ...(project.inbox_project !== undefined && { inbox_project: project.inbox_project })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Project');
            }
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
