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
    can_assign_tasks: z.boolean(),
    can_comment: z.boolean(),
    child_order: z.number(),
    is_collapsed: z.boolean(),
    color: z.string(),
    creator_uid: z.string(),
    created_at: z.string(),
    is_archived: z.boolean(),
    is_deleted: z.boolean(),
    is_favorite: z.boolean(),
    is_frozen: z.boolean(),
    name: z.string(),
    is_shared: z.boolean(),
    updated_at: z.string(),
    view_style: z.string(),
    default_order: z.number(),
    description: z.string(),
    public_access: z.boolean(),
    public_key: z.string(),
    access: ProjectAccessSchema,
    role: z.string(),
    goal_ids: z.array(z.string()),
    parent_id: z.string().nullable(),
    inbox_project: z.boolean()
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
