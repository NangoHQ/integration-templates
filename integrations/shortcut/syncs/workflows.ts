import { createSync } from 'nango';
import { z } from 'zod';

const ProviderWorkflowStateSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    color: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    entity_type: z.string().nullable().optional(),
    num_stories: z.number().int().nullable().optional(),
    num_story_templates: z.number().int().nullable().optional(),
    position: z.number().int().nullable().optional(),
    type: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    verb: z.string().nullable().optional()
});

const ProviderWorkflowSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    auto_assign_owner: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional(),
    default_state_id: z.number().int().nullable().optional(),
    description: z.string().nullable().optional(),
    entity_type: z.string().nullable().optional(),
    project_ids: z.array(z.number().int()).nullable().optional(),
    states: z.array(ProviderWorkflowStateSchema).nullable().optional(),
    team_id: z.number().int().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const WorkflowStateSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    created_at: z.string().optional(),
    description: z.string().optional(),
    entity_type: z.string().optional(),
    num_stories: z.number().int().optional(),
    num_story_templates: z.number().int().optional(),
    position: z.number().int().optional(),
    type: z.string().optional(),
    updated_at: z.string().optional(),
    verb: z.string().optional()
});

const WorkflowSchema = z.object({
    id: z.string(),
    name: z.string(),
    auto_assign_owner: z.boolean().optional(),
    created_at: z.string().optional(),
    default_state_id: z.number().int().optional(),
    description: z.string().optional(),
    entity_type: z.string().optional(),
    project_ids: z.array(z.number().int()).optional(),
    states: z.array(WorkflowStateSchema).optional(),
    team_id: z.number().int().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync story workflows and their states.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Workflow: WorkflowSchema
    },

    exec: async (nango) => {
        // https://developer.shortcut.com/api/rest/v3#get-workflows
        const response = await nango.get({
            endpoint: '/api/v3/workflows',
            retries: 3
        });

        const parseResult = z.array(ProviderWorkflowSchema).safeParse(response.data);
        if (!parseResult.success) {
            throw new Error(`Failed to parse workflows: ${parseResult.error.message}`);
        }

        await nango.trackDeletesStart('Workflow');

        const workflows = parseResult.data.map((workflow) => {
            const mappedStates = workflow.states?.map((state) => ({
                id: String(state.id),
                name: state.name,
                ...(state.color != null && { color: state.color }),
                ...(state.created_at != null && { created_at: state.created_at }),
                ...(state.description != null && { description: state.description }),
                ...(state.entity_type != null && { entity_type: state.entity_type }),
                ...(state.num_stories != null && { num_stories: state.num_stories }),
                ...(state.num_story_templates != null && { num_story_templates: state.num_story_templates }),
                ...(state.position != null && { position: state.position }),
                ...(state.type != null && { type: state.type }),
                ...(state.updated_at != null && { updated_at: state.updated_at }),
                ...(state.verb != null && { verb: state.verb })
            }));

            return {
                id: String(workflow.id),
                name: workflow.name,
                ...(workflow.auto_assign_owner != null && { auto_assign_owner: workflow.auto_assign_owner }),
                ...(workflow.created_at != null && { created_at: workflow.created_at }),
                ...(workflow.default_state_id != null && { default_state_id: workflow.default_state_id }),
                ...(workflow.description != null && { description: workflow.description }),
                ...(workflow.entity_type != null && { entity_type: workflow.entity_type }),
                ...(workflow.project_ids != null && { project_ids: workflow.project_ids }),
                ...(mappedStates != null && { states: mappedStates }),
                ...(workflow.team_id != null && { team_id: workflow.team_id }),
                ...(workflow.updated_at != null && { updated_at: workflow.updated_at })
            };
        });

        if (workflows.length > 0) {
            await nango.batchSave(workflows, 'Workflow');
        }

        await nango.trackDeletesEnd('Workflow');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
