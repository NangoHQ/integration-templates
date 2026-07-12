import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Story name. Example: "Fix login bug"'),
    workflow_state_id: z.number().optional().describe('Workflow state ID. Example: 500000007. If omitted along with project_id, the workspace default workflow state is used.'),
    project_id: z.number().optional().describe('Project ID. Example: 36'),
    description: z.string().optional().describe('Story description.'),
    story_type: z.enum(['feature', 'bug', 'chore']).optional().describe("Story type. Default: 'feature'."),
    epic_id: z.number().optional().describe('Epic ID.'),
    iteration_id: z.number().optional().describe('Iteration ID.'),
    group_id: z.string().optional().describe('Group (modern team) UUID.'),
    owner_ids: z.array(z.string()).optional().describe('Member UUIDs who own the story.'),
    label_ids: z.array(z.number()).optional().describe('Label IDs to attach.'),
    deadline: z.string().optional().describe('Deadline in ISO 8601 format.'),
    estimate: z.number().optional().describe('Point estimate (only meaningful for feature stories).')
});

const WorkflowSchema = z.object({
    id: z.number(),
    default_state_id: z.number(),
    states: z.array(
        z.object({
            id: z.number(),
            name: z.string()
        })
    )
});

const ProviderStorySchema = z.object({
    id: z.number(),
    name: z.string(),
    story_type: z.string().nullable().optional(),
    workflow_state_id: z.number().nullable().optional(),
    project_id: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    epic_id: z.number().nullable().optional(),
    iteration_id: z.number().nullable().optional(),
    group_id: z.string().nullable().optional(),
    owner_ids: z.array(z.string()).nullable().optional(),
    label_ids: z.array(z.number()).nullable().optional(),
    deadline: z.string().nullable().optional(),
    estimate: z.number().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    story_type: z.string().optional(),
    workflow_state_id: z.number().optional(),
    project_id: z.number().optional(),
    description: z.string().optional(),
    epic_id: z.number().optional(),
    iteration_id: z.number().optional(),
    group_id: z.string().optional(),
    owner_ids: z.array(z.string()).optional(),
    label_ids: z.array(z.number()).optional(),
    deadline: z.string().optional(),
    estimate: z.number().optional()
});

const action = createAction({
    description: 'Create a story.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        let workflowStateId = input.workflow_state_id;

        if (workflowStateId === undefined && input.project_id === undefined) {
            const getWorkflowsConfig: ProxyConfiguration = {
                // https://developer.shortcut.com/api/rest/v3#List-Workflows
                endpoint: '/api/v3/workflows',
                retries: 3
            };

            const workflowsResponse = await nango.get(getWorkflowsConfig);

            const workflows = z.array(WorkflowSchema).parse(workflowsResponse.data);

            const firstWorkflow = workflows[0];

            if (firstWorkflow === undefined) {
                throw new nango.ActionError({
                    type: 'missing_workflow',
                    message: 'No workflows found in the workspace. Please provide workflow_state_id or project_id.'
                });
            }

            workflowStateId = firstWorkflow.default_state_id;
        }

        const postStoryConfig: ProxyConfiguration = {
            // https://developer.shortcut.com/api/rest/v3#Create-Story
            endpoint: '/api/v3/stories',
            data: {
                name: input.name,
                ...(workflowStateId !== undefined && { workflow_state_id: workflowStateId }),
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.story_type !== undefined && { story_type: input.story_type }),
                ...(input.epic_id !== undefined && { epic_id: input.epic_id }),
                ...(input.iteration_id !== undefined && { iteration_id: input.iteration_id }),
                ...(input.group_id !== undefined && { group_id: input.group_id }),
                ...(input.owner_ids !== undefined && { owner_ids: input.owner_ids }),
                ...(input.label_ids !== undefined && { label_ids: input.label_ids }),
                ...(input.deadline !== undefined && { deadline: input.deadline }),
                ...(input.estimate !== undefined && { estimate: input.estimate })
            },
            retries: 1
        };

        const response = await nango.post(postStoryConfig);

        const story = ProviderStorySchema.parse(response.data);

        return {
            id: story.id,
            name: story.name,
            ...(story.story_type != null && { story_type: story.story_type }),
            ...(story.workflow_state_id != null && { workflow_state_id: story.workflow_state_id }),
            ...(story.project_id != null && { project_id: story.project_id }),
            ...(story.description != null && { description: story.description }),
            ...(story.epic_id != null && { epic_id: story.epic_id }),
            ...(story.iteration_id != null && { iteration_id: story.iteration_id }),
            ...(story.group_id != null && { group_id: story.group_id }),
            ...(story.owner_ids != null && { owner_ids: story.owner_ids }),
            ...(story.label_ids != null && { label_ids: story.label_ids }),
            ...(story.deadline != null && { deadline: story.deadline }),
            ...(story.estimate != null && { estimate: story.estimate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
