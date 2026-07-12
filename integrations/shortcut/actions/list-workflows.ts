import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const WorkflowStateSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.enum(['backlog', 'unstarted', 'started', 'done']),
    color: z.string().optional(),
    description: z.string().optional(),
    entity_type: z.string().optional(),
    position: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    num_stories: z.number().optional(),
    num_story_templates: z.number().optional(),
    verb: z.string().optional()
});

const WorkflowSchema = z.object({
    id: z.number(),
    name: z.string(),
    default_state_id: z.number(),
    states: z.array(WorkflowStateSchema),
    description: z.string().optional(),
    entity_type: z.string().optional(),
    team_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    auto_assign_owner: z.boolean().optional(),
    project_ids: z.array(z.number()).optional()
});

const OutputSchema = z.object({
    workflows: z.array(WorkflowSchema)
});

function stripNullValues(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(stripNullValues);
    }
    if (value !== null && typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
            if (v !== null) {
                result[k] = stripNullValues(v);
            }
        }
        return result;
    }
    return value;
}

const action = createAction({
    description: 'List story workflows and their states.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shortcut.com/api/rest/v3#List-Workflows
            endpoint: '/api/v3/workflows',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of workflows from the Shortcut API.'
            });
        }

        const cleaned = stripNullValues(response.data);
        const workflows = z.array(WorkflowSchema).parse(cleaned);

        return {
            workflows
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
