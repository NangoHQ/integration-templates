import { z } from 'zod';
import { createAction } from 'nango';

const StoryCommentSchema = z.object({
    id: z.number(),
    text: z.string(),
    author_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const TaskSchema = z.object({
    id: z.number(),
    description: z.string(),
    complete: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    position: z.number().optional(),
    owner_ids: z.array(z.string()).optional()
});

const StoryCustomFieldSchema = z.object({
    field_id: z.string(),
    value: z.unknown().optional(),
    value_id: z.string().nullable().optional()
});

const TypedStoryLinkSchema = z.object({
    id: z.number(),
    subject_id: z.number(),
    object_id: z.number(),
    verb: z.string(),
    created_at: z.string().optional()
});

const LabelSlimSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().optional(),
    archived: z.boolean().optional(),
    created_at: z.string().optional(),
    description: z.string().nullable().optional(),
    entity_type: z.string().optional(),
    external_id: z.string().nullable().optional(),
    updated_at: z.string().optional()
});

const StoryStatsSchema = z.object({
    num_points: z.number().optional(),
    num_points_done: z.number().optional(),
    num_points_started: z.number().optional(),
    num_points_unstarted: z.number().optional(),
    num_stories_total: z.number().optional(),
    num_stories_done: z.number().optional(),
    num_stories_started: z.number().optional(),
    num_stories_unestimated: z.number().optional(),
    num_stories_unstarted: z.number().optional(),
    num_related_documents: z.number().optional(),
    average_cycle_time: z.number().optional(),
    average_lead_time: z.number().optional(),
    last_story_update: z.string().optional()
});

const StorySchema = z
    .object({
        app_url: z.string(),
        archived: z.boolean(),
        blocked: z.boolean().optional(),
        blocker: z.boolean().optional(),
        branches: z.array(z.unknown()).optional(),
        comments: z.array(StoryCommentSchema).optional(),
        commits: z.array(z.unknown()).optional(),
        completed: z.boolean().optional(),
        completed_at: z.string().nullable().optional(),
        completed_at_override: z.string().nullable().optional(),
        created_at: z.string(),
        custom_fields: z.array(StoryCustomFieldSchema).optional(),
        cycle_time: z.number().nullable().optional(),
        deadline: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        entity_type: z.string(),
        epic_id: z.number().nullable().optional(),
        estimate: z.number().nullable().optional(),
        external_id: z.string().nullable().optional(),
        external_links: z.array(z.string()).optional(),
        files: z.array(z.unknown()).optional(),
        follower_ids: z.array(z.string()).optional(),
        group_id: z.string().nullable().optional(),
        group_mention_ids: z.array(z.string()).optional(),
        id: z.number(),
        iteration_id: z.number().nullable().optional(),
        label_ids: z.array(z.number()).optional(),
        labels: z.array(LabelSlimSchema).optional(),
        lead_time: z.number().nullable().optional(),
        linked_files: z.array(z.unknown()).optional(),
        member_mention_ids: z.array(z.string()).optional(),
        mention_ids: z.array(z.string()).optional(),
        moved_at: z.string().nullable().optional(),
        name: z.string(),
        owner_ids: z.array(z.string()).optional(),
        parent_story_id: z.number().nullable().optional(),
        position: z.number().optional(),
        previous_iteration_ids: z.array(z.number()).optional(),
        project_id: z.number().nullable().optional(),
        pull_requests: z.array(z.unknown()).optional(),
        requested_by_id: z.string().optional(),
        started: z.boolean().optional(),
        started_at: z.string().nullable().optional(),
        started_at_override: z.string().nullable().optional(),
        stats: StoryStatsSchema.optional(),
        story_links: z.array(TypedStoryLinkSchema).optional(),
        story_template_id: z.string().nullable().optional(),
        story_type: z.string(),
        sub_task_story_ids: z.array(z.number()).optional(),
        tasks: z.array(TaskSchema).optional(),
        updated_at: z.string().nullable().optional(),
        workflow_id: z.number(),
        workflow_state_id: z.number()
    })
    .passthrough();

const InputSchema = z.object({
    story_public_id: z.number().int().describe('The unique ID of the Story to update. Example: 35'),
    name: z.string().optional().describe('The title of the story.'),
    description: z.string().optional().describe('The description of the story.'),
    workflow_state_id: z.number().optional().describe('The ID of the workflow state to put the story in.'),
    epic_id: z.number().nullable().optional().describe('The ID of the epic the story belongs to.'),
    iteration_id: z.number().nullable().optional().describe('The ID of the iteration the story belongs to.'),
    owner_ids: z.array(z.string()).optional().describe('An array of UUIDs of the owners of this story.'),
    label_ids: z.array(z.number()).optional().describe('An array of label ids attached to the story.'),
    archived: z.boolean().optional().describe('True if the story is archived, otherwise false.'),
    deadline: z.string().nullable().optional().describe('The due date of the story.'),
    estimate: z.number().nullable().optional().describe('The numeric point estimate of the story. Can also be null, which means unestimated.'),
    project_id: z.number().nullable().optional().describe('The ID of the project the story belongs to.'),
    group_id: z.string().nullable().optional().describe('The ID of the group to associate with this story.'),
    story_type: z.enum(['bug', 'chore', 'feature']).optional().describe('The type of story (feature, bug, chore).'),
    follower_ids: z.array(z.string()).optional().describe('An array of UUIDs of the followers of this story.'),
    custom_fields: z
        .array(
            z.object({
                field_id: z.string(),
                value_id: z.string().nullable().optional()
            })
        )
        .optional()
        .describe('A map specifying a CustomField ID and CustomFieldEnumValue ID.'),
    external_links: z.array(z.string()).optional().describe('An array of External Links associated with this story.'),
    file_ids: z.array(z.number()).optional().describe('An array of IDs of files attached to the story.'),
    linked_file_ids: z.array(z.number()).optional().describe('An array of IDs of linked files attached to the story.'),
    pull_request_ids: z.array(z.number()).optional().describe('An array of IDs of Pull/Merge Requests attached to the story.'),
    requested_by_id: z.string().optional().describe('The ID of the member that requested the story.'),
    started_at_override: z.string().nullable().optional().describe('A manual override for the time/date the Story was started.'),
    completed_at_override: z.string().nullable().optional().describe('A manual override for the time/date the Story was completed.'),
    after_id: z.number().optional().describe('The ID of the story we want to move this story after.'),
    before_id: z.number().optional().describe('The ID of the story we want to move this story before.'),
    move_to: z.enum(['first', 'last']).optional().describe('One of "first" or "last".'),
    branch_ids: z.array(z.number()).optional().describe('An array of IDs of Branches attached to the story.'),
    commit_ids: z.array(z.number()).optional().describe('An array of IDs of Commits attached to the story.'),
    sub_tasks: z
        .array(
            z.object({
                story_id: z.number()
            })
        )
        .optional()
        .describe('An array of story IDs to attach to this story as sub-tasks.')
});

const OutputSchema = StorySchema;

const action = createAction({
    description: 'Update a story.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.shortcut.com/api/rest/v3#Update-Story
            endpoint: `/api/v3/stories/${encodeURIComponent(input.story_public_id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.workflow_state_id !== undefined && { workflow_state_id: input.workflow_state_id }),
                ...(input.epic_id !== undefined && { epic_id: input.epic_id }),
                ...(input.iteration_id !== undefined && { iteration_id: input.iteration_id }),
                ...(input.owner_ids !== undefined && { owner_ids: input.owner_ids }),
                ...(input.label_ids !== undefined && { label_ids: input.label_ids }),
                ...(input.archived !== undefined && { archived: input.archived }),
                ...(input.deadline !== undefined && { deadline: input.deadline }),
                ...(input.estimate !== undefined && { estimate: input.estimate }),
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.group_id !== undefined && { group_id: input.group_id }),
                ...(input.story_type !== undefined && { story_type: input.story_type }),
                ...(input.follower_ids !== undefined && { follower_ids: input.follower_ids }),
                ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
                ...(input.external_links !== undefined && { external_links: input.external_links }),
                ...(input.file_ids !== undefined && { file_ids: input.file_ids }),
                ...(input.linked_file_ids !== undefined && { linked_file_ids: input.linked_file_ids }),
                ...(input.pull_request_ids !== undefined && { pull_request_ids: input.pull_request_ids }),
                ...(input.requested_by_id !== undefined && { requested_by_id: input.requested_by_id }),
                ...(input.started_at_override !== undefined && { started_at_override: input.started_at_override }),
                ...(input.completed_at_override !== undefined && { completed_at_override: input.completed_at_override }),
                ...(input.after_id !== undefined && { after_id: input.after_id }),
                ...(input.before_id !== undefined && { before_id: input.before_id }),
                ...(input.move_to !== undefined && { move_to: input.move_to }),
                ...(input.branch_ids !== undefined && { branch_ids: input.branch_ids }),
                ...(input.commit_ids !== undefined && { commit_ids: input.commit_ids }),
                ...(input.sub_tasks !== undefined && { sub_tasks: input.sub_tasks })
            },
            retries: 10
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Story ${input.story_public_id} not found.`
            });
        }

        if (response.status === 422) {
            throw new nango.ActionError({
                type: 'unprocessable',
                message: 'The update request was unprocessable. Ensure required fields and relationships are valid.'
            });
        }

        const story = StorySchema.parse(response.data);
        return story;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
