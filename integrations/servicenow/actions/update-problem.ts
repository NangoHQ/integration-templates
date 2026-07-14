import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('Problem sys_id. Example: "8f3647b9c3ca0310c5a8fc0d05013176"'),
    short_description: z.string().optional().describe('Short description of the problem'),
    description: z.string().optional().describe('Detailed description of the problem'),
    state: z.string().optional().describe('Problem state value. Example: "1"'),
    impact: z.string().optional().describe('Impact value. Example: "1"'),
    urgency: z.string().optional().describe('Urgency value. Example: "1"'),
    work_notes: z.string().optional().describe('Work notes to append'),
    comments: z.string().optional().describe('Comments to append'),
    assigned_to: z.string().optional().describe('Sys_id of the assigned user'),
    active: z.boolean().optional().describe('Whether the problem is active')
});

const ReferenceSchema = z.object({
    link: z.string(),
    value: z.string()
});

const ProviderProblemSchema = z
    .object({
        sys_id: z.string(),
        number: z.string().optional(),
        short_description: z.string().optional(),
        description: z.string().optional(),
        state: z.string().optional(),
        impact: z.string().optional(),
        urgency: z.string().optional(),
        priority: z.string().optional(),
        active: z.string().optional(),
        assigned_to: z.union([z.string(), ReferenceSchema]).optional(),
        sys_created_on: z.string().optional(),
        sys_updated_on: z.string().optional(),
        work_notes: z.string().optional(),
        comments: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        sys_id: z.string(),
        number: z.string().optional(),
        short_description: z.string().optional(),
        description: z.string().optional(),
        state: z.string().optional(),
        impact: z.string().optional(),
        urgency: z.string().optional(),
        priority: z.string().optional(),
        active: z.string().optional(),
        assigned_to: z.union([z.string(), ReferenceSchema]).optional(),
        sys_created_on: z.string().optional(),
        sys_updated_on: z.string().optional(),
        work_notes: z.string().optional(),
        comments: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update problem fields',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['itil'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.short_description !== undefined) {
            body['short_description'] = input.short_description;
        }
        if (input.description !== undefined) {
            body['description'] = input.description;
        }
        if (input.state !== undefined) {
            body['state'] = input.state;
        }
        if (input.impact !== undefined) {
            body['impact'] = input.impact;
        }
        if (input.urgency !== undefined) {
            body['urgency'] = input.urgency;
        }
        if (input.work_notes !== undefined) {
            body['work_notes'] = input.work_notes;
        }
        if (input.comments !== undefined) {
            body['comments'] = input.comments;
        }
        if (input.assigned_to !== undefined) {
            body['assigned_to'] = input.assigned_to;
        }
        if (input.active !== undefined) {
            body['active'] = input.active;
        }

        // https://developer.servicenow.com/dev.do#!/reference/api/now/table/problem/{sys_id}
        await nango.patch({
            endpoint: `/api/now/table/problem/${encodeURIComponent(input.sys_id)}`,
            data: body,
            retries: 1
        });

        // https://developer.servicenow.com/dev.do#!/reference/api/now/table/problem/{sys_id}
        const response = await nango.get({
            endpoint: `/api/now/table/problem/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('result' in response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from ServiceNow'
            });
        }

        const parsed = ProviderProblemSchema.safeParse(response.data.result);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse problem response',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
