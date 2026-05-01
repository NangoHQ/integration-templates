import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_gid: z.string().describe('The task to operate on. Example: "1200000000000001"'),
    opt_fields: z.array(z.string()).optional().describe('Optional fields to include in the response.')
});

const CompactResourceSchema = z
    .object({
        gid: z.string(),
        name: z.string().optional(),
        resource_type: z.string().optional()
    })
    .passthrough();

const UserSchema = z
    .object({
        gid: z.string(),
        name: z.string().optional(),
        resource_type: z.string().optional(),
        email: z.string().optional()
    })
    .passthrough();

const ProjectMembershipSchema = z
    .object({
        project: CompactResourceSchema.optional(),
        section: CompactResourceSchema.optional()
    })
    .passthrough();

const CustomFieldEnumOptionSchema = z
    .object({
        gid: z.string(),
        name: z.string().optional(),
        color: z.string().optional(),
        enabled: z.boolean().optional(),
        resource_type: z.string().optional()
    })
    .passthrough();

const CustomFieldSchema = z
    .object({
        gid: z.string(),
        name: z.string().optional(),
        resource_type: z.string().optional(),
        type: z.string().optional(),
        enum_value: CustomFieldEnumOptionSchema.nullable().optional(),
        multi_enum_values: z.array(CustomFieldEnumOptionSchema).optional(),
        number_value: z.number().nullable().optional(),
        text_value: z.string().nullable().optional(),
        date_value: z
            .object({
                date: z.string().optional(),
                date_time: z.string().optional()
            })
            .passthrough()
            .nullable()
            .optional(),
        display_value: z.string().nullable().optional()
    })
    .passthrough();

const ProviderTaskSchema = z
    .object({
        gid: z.string(),
        name: z.string(),
        resource_type: z.string().optional(),
        assignee: UserSchema.nullable().optional(),
        assignee_status: z.string().optional(),
        assignee_section: CompactResourceSchema.nullable().optional(),
        due_on: z.string().nullable().optional(),
        due_at: z.string().nullable().optional(),
        completed: z.boolean().optional(),
        completed_at: z.string().nullable().optional(),
        completed_by: UserSchema.nullable().optional(),
        created_at: z.string().optional(),
        created_by: UserSchema.nullable().optional(),
        modified_at: z.string().optional(),
        notes: z.string().optional(),
        html_notes: z.string().optional(),
        permalink_url: z.string().optional(),
        projects: z.array(CompactResourceSchema).optional(),
        workspace: CompactResourceSchema.optional(),
        parent: CompactResourceSchema.nullable().optional(),
        tags: z.array(CompactResourceSchema).optional(),
        followers: z.array(UserSchema).optional(),
        custom_fields: z.array(CustomFieldSchema).optional(),
        memberships: z.array(ProjectMembershipSchema).optional(),
        likes: z
            .array(
                z
                    .object({
                        user: UserSchema.optional()
                    })
                    .passthrough()
            )
            .optional(),
        liked: z.boolean().optional(),
        approval_status: z.string().optional(),
        start_on: z.string().nullable().optional(),
        actual_time_minutes: z.number().nullable().optional(),
        num_subtasks: z.number().optional(),
        num_hearts: z.number().optional(),
        num_likes: z.number().optional(),
        hearted: z.boolean().optional(),
        hearts: z.array(z.unknown()).optional(),
        external: z
            .object({
                gid: z.string().optional(),
                data: z.string().optional()
            })
            .passthrough()
            .nullable()
            .optional(),
        dependencies: z.array(CompactResourceSchema).optional(),
        dependents: z.array(CompactResourceSchema).optional()
    })
    .passthrough();

const OutputSchema = ProviderTaskSchema;

const action = createAction({
    description: 'Fetch a single task by gid.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { opt_fields?: string } = {};
        if (input.opt_fields && input.opt_fields.length > 0) {
            params.opt_fields = input.opt_fields.join(',');
        }

        // https://developers.asana.com/reference/gettask
        const response = await nango.get({
            endpoint: `/api/1.0/tasks/${encodeURIComponent(input.task_gid)}`,
            params: params,
            retries: 3
        });

        const wrapper = z.object({ data: z.unknown() }).parse(response.data);
        if (!wrapper.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task not found',
                task_gid: input.task_gid
            });
        }

        const task = ProviderTaskSchema.parse(wrapper.data);
        return task;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
