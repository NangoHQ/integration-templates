import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) containing the step.'),
        stepId: z.number().describe('The ID of the card table step to update.'),
        title: z.string().optional().describe('New title for the step. Omit to leave unchanged.'),
        dueOn: z
            .string()
            .nullable()
            .optional()
            .describe('New due date for the step in ISO 8601 format (e.g., "2026-08-26"). Pass null to clear the due date. Omit to leave unchanged.'),
        assigneeIds: z
            .array(z.number())
            .optional()
            .describe('Array of person IDs to assign to the step. Pass an empty array to remove all assignees. Omit to leave unchanged.')
    })
    .describe('Input to update a card table step.');

const ParentSchema = z.object({
    id: z.number().describe('The ID of the parent card.'),
    title: z.string().describe('The title of the parent card.'),
    type: z.string().describe('The Basecamp type of the parent card.'),
    url: z.string().describe('The API URL of the parent card.'),
    app_url: z.string().describe('The Basecamp app URL of the parent card.')
});

const BucketSchema = z.object({
    id: z.number().describe('The ID of the project (bucket).'),
    name: z.string().describe('The name of the project.'),
    type: z.string().describe('The Basecamp type of the bucket.')
});

const CompanySchema = z.object({
    id: z.number().describe('The ID of the company.'),
    name: z.string().describe('The name of the company.')
});

const CreatorSchema = z.object({
    id: z.number().describe('The ID of the creator.'),
    attachable_sgid: z.string().describe('The attachable SGID of the creator.'),
    name: z.string().describe('The name of the creator.'),
    personable_type: z.string().describe('The personable type of the creator.'),
    title: z.string().nullable().describe('The title of the creator.'),
    tagline: z.string().nullable().describe('The tagline of the creator.'),
    location: z.string().nullable().describe('The location of the creator.'),
    created_at: z.string().describe('ISO 8601 timestamp when the creator was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the creator was last updated.'),
    email_address: z.string().nullable().optional().describe('The email address of the creator, if exposed by the provider.'),
    bio: z.string().nullable().describe('The bio of the creator.'),
    admin: z.boolean().describe('Whether the creator is an admin.'),
    owner: z.boolean().describe('Whether the creator is an owner.'),
    client: z.boolean().describe('Whether the creator is a client.'),
    employee: z.boolean().describe('Whether the creator is an employee.'),
    time_zone: z.string().describe('The time zone of the creator.'),
    avatar_url: z.string().describe('The avatar URL of the creator.'),
    company: CompanySchema.optional().describe('The company of the creator, if any.'),
    can_ping: z.boolean().describe('Whether the creator can be pinged.'),
    can_manage_projects: z.boolean().describe('Whether the creator can manage projects.'),
    can_manage_people: z.boolean().describe('Whether the creator can manage people.'),
    can_access_timesheet: z.boolean().describe('Whether the creator can access timesheets.'),
    can_access_hill_charts: z.boolean().describe('Whether the creator can access hill charts.')
});

const AssigneeSchema = z.object({
    id: z.number().describe('The ID of the assignee.'),
    attachable_sgid: z.string().describe('The attachable SGID of the assignee.'),
    name: z.string().describe('The name of the assignee.'),
    personable_type: z.string().describe('The personable type of the assignee.'),
    title: z.string().nullable().describe('The title of the assignee.'),
    tagline: z.string().nullable().describe('The tagline of the assignee.'),
    location: z.string().nullable().describe('The location of the assignee.'),
    created_at: z.string().describe('ISO 8601 timestamp when the assignee was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the assignee was last updated.'),
    email_address: z.string().nullable().optional().describe('The email address of the assignee, if exposed by the provider.'),
    bio: z.string().nullable().describe('The bio of the assignee.'),
    admin: z.boolean().describe('Whether the assignee is an admin.'),
    owner: z.boolean().describe('Whether the assignee is an owner.'),
    client: z.boolean().describe('Whether the assignee is a client.'),
    employee: z.boolean().describe('Whether the assignee is an employee.'),
    time_zone: z.string().describe('The time zone of the assignee.'),
    avatar_url: z.string().describe('The avatar URL of the assignee.'),
    can_ping: z.boolean().describe('Whether the assignee can be pinged.'),
    can_manage_projects: z.boolean().describe('Whether the assignee can manage projects.'),
    can_manage_people: z.boolean().describe('Whether the assignee can manage people.'),
    can_access_timesheet: z.boolean().describe('Whether the assignee can access timesheets.'),
    can_access_hill_charts: z.boolean().describe('Whether the assignee can access hill charts.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the step.'),
        status: z.string().describe('The status of the step, e.g., "active".'),
        visible_to_clients: z.boolean().describe('Whether the step is visible to clients.'),
        created_at: z.string().describe('ISO 8601 timestamp when the step was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the step was last updated.'),
        title: z.string().describe('The title of the step.'),
        inherits_status: z.boolean().describe('Whether the step inherits its parent card status.'),
        type: z.string().describe('The Basecamp type of the step, e.g., "Kanban::Step".'),
        url: z.string().describe('The API URL of the step.'),
        app_url: z.string().describe('The Basecamp app URL of the step.'),
        bookmark_url: z.string().describe('The bookmark URL for the step.'),
        position: z.number().describe('The position of the step within its parent card.'),
        parent: ParentSchema.describe('The parent card of the step.'),
        bucket: BucketSchema.describe('The project (bucket) containing the step.'),
        creator: CreatorSchema.describe('The person who created the step.'),
        completed: z.boolean().describe('Whether the step is marked as completed.'),
        due_on: z.string().nullable().describe('The due date of the step in ISO 8601 format, or null if not set.'),
        assignees: z.array(AssigneeSchema).describe('The people assigned to the step.'),
        completion_url: z.string().describe('The API URL to toggle the step completion status.')
    })
    .describe('The updated card table step.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing card step by updating its title, due date, or assignees.
 * @pitfalls: Omitted fields are left unchanged; you must explicitly pass null to clear the due date or an empty array to remove all assignees. Step completion status cannot be changed through this action even though the output includes a completed field.
 */
const action = createAction({
    description: 'Update a card step title, due date, or assignees.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.title !== undefined) {
            body['title'] = input.title;
        }
        if (input.dueOn !== undefined) {
            body['due_on'] = input.dueOn;
        }
        if (input.assigneeIds !== undefined) {
            body['assignee_ids'] = input.assigneeIds;
        }

        const response = await nango.put({
            // https://github.com/basecamp/bc3-api/blob/master/sections/card_table_steps.md#update-a-step
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/steps/${encodeURIComponent(input.stepId)}.json`,
            data: body,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
