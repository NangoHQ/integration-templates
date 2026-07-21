import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Project ID. Example: "6h78PW84RjxxRW8q"')
});

const ProjectSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        color: z.string().optional(),
        parent_id: z.string().nullable().optional(),
        child_order: z.number().optional(),
        default_order: z.number().optional(),
        is_favorite: z.boolean().optional(),
        is_archived: z.boolean().optional(),
        view_style: z.string().optional(),
        is_collapsed: z.boolean().optional(),
        is_deleted: z.boolean().optional(),
        is_frozen: z.boolean().optional(),
        is_shared: z.boolean().optional(),
        inbox_project: z.boolean().optional(),
        public_access: z.boolean().optional(),
        description: z.string().optional(),
        creator_uid: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Archive a project.',
    version: '1.0.0',
    input: InputSchema,
    output: ProjectSchema,
    scopes: ['data:read_write'],

    exec: async (nango, input): Promise<z.infer<typeof ProjectSchema>> => {
        const encodedProjectId = encodeURIComponent(input.project_id);

        // https://developer.todoist.com/api/v1/#archive-a-project
        await nango.post({
            endpoint: `/api/v1/projects/${encodedProjectId}/archive`,
            retries: 10
        });

        // https://developer.todoist.com/api/v1/#get-a-project
        const response = await nango.get({
            endpoint: `/api/v1/projects/${encodedProjectId}`,
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found after archiving.',
                project_id: input.project_id
            });
        }

        const project = ProjectSchema.parse(response.data);

        return project;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
