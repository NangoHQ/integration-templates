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
        number: z.string().optional().nullable(),
        short_description: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        impact: z.string().optional().nullable(),
        urgency: z.string().optional().nullable(),
        priority: z.string().optional().nullable(),
        active: z.string().optional().nullable(),
        assigned_to: z.union([z.string(), ReferenceSchema]).optional().nullable(),
        sys_created_on: z.string().optional().nullable(),
        sys_updated_on: z.string().optional().nullable(),
        work_notes: z.string().optional().nullable(),
        comments: z.string().optional().nullable()
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
        // Plain fields are safe to overwrite and safe to retry: a retried PATCH just
        // re-applies the same final value.
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
        if (input.assigned_to !== undefined) {
            body['assigned_to'] = input.assigned_to;
        }
        if (input.active !== undefined) {
            body['active'] = input.active;
        }

        // work_notes/comments are ServiceNow journal fields: every PATCH appends a new
        // entry rather than overwriting. They must not be retried automatically, or a
        // transient failure followed by a retry can duplicate the entry.
        const journalBody: Record<string, unknown> = {};
        if (input.work_notes !== undefined) {
            journalBody['work_notes'] = input.work_notes;
        }
        if (input.comments !== undefined) {
            journalBody['comments'] = input.comments;
        }

        const endpoint = `/api/now/table/problem/${encodeURIComponent(input.sys_id)}`;

        // https://developer.servicenow.com/dev.do#!/reference/api/now/table/problem/{sys_id}
        if (Object.keys(body).length > 0 || Object.keys(journalBody).length === 0) {
            await nango.patch({
                endpoint,
                data: body,
                retries: 1
            });
        }

        if (Object.keys(journalBody).length > 0) {
            await nango.patch({
                endpoint,
                data: journalBody,
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            });
        }

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

        const problem = parsed.data;
        const {
            sys_id,
            number,
            short_description,
            description,
            state,
            impact,
            urgency,
            priority,
            active,
            assigned_to,
            sys_created_on,
            sys_updated_on,
            work_notes,
            comments,
            ...rest
        } = problem;

        return {
            ...rest,
            sys_id,
            ...(number != null && { number }),
            ...(short_description != null && { short_description }),
            ...(description != null && { description }),
            ...(state != null && { state }),
            ...(impact != null && { impact }),
            ...(urgency != null && { urgency }),
            ...(priority != null && { priority }),
            ...(active != null && { active }),
            ...(assigned_to != null && { assigned_to }),
            ...(sys_created_on != null && { sys_created_on }),
            ...(sys_updated_on != null && { sys_updated_on }),
            ...(work_notes != null && { work_notes }),
            ...(comments != null && { comments })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
