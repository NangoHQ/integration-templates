import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('The ID of the project to unarchive. Example: "6h78PXjmJfqpxmQV"')
});

const ProjectAccessSchema = z.object({
    visibility: z.string(),
    configuration: z.record(z.string(), z.unknown())
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    can_assign_tasks: z.boolean().optional(),
    can_comment: z.boolean().optional(),
    child_order: z.number().optional(),
    is_collapsed: z.boolean().optional(),
    color: z.string().optional(),
    creator_uid: z.string().optional(),
    created_at: z.string().optional(),
    is_archived: z.boolean().optional(),
    is_deleted: z.boolean().optional(),
    is_favorite: z.boolean().optional(),
    is_frozen: z.boolean().optional(),
    name: z.string(),
    is_shared: z.boolean().optional(),
    updated_at: z.string().optional(),
    view_style: z.string().optional(),
    default_order: z.number().optional(),
    description: z.string().optional(),
    public_access: z.boolean().optional(),
    public_key: z.string().optional(),
    access: ProjectAccessSchema.nullable().optional(),
    role: z.string().optional(),
    goal_ids: z.array(z.string()).optional(),
    parent_id: z.string().nullable().optional(),
    inbox_project: z.boolean().optional()
});

const OutputSchema = ProviderProjectSchema;

const action = createAction({
    description: 'Unarchive a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.todoist.com/api/v1/#tag/Projects/operation/postUnarchive_Project
            endpoint: `/api/v1/projects/${encodeURIComponent(input.project_id)}/unarchive`,
            retries: 10
        });

        const providerProject = ProviderProjectSchema.parse(response.data);

        return providerProject;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
