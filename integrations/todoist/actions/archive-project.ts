import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Project ID. Example: "6h78PW84RjxxRW8q"')
});

const ProjectSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        color: z.string(),
        parent_id: z.string().nullable(),
        child_order: z.number(),
        default_order: z.number(),
        is_favorite: z.boolean(),
        is_archived: z.boolean(),
        view_style: z.string(),
        is_collapsed: z.boolean(),
        is_deleted: z.boolean(),
        is_frozen: z.boolean(),
        is_shared: z.boolean(),
        inbox_project: z.boolean(),
        public_access: z.boolean(),
        description: z.string(),
        creator_uid: z.string(),
        created_at: z.string(),
        updated_at: z.string()
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
