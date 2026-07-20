import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    short_description: z.string().describe('Short description of the problem. Example: "Network outage in building A"'),
    description: z.string().optional().describe('Detailed description of the problem'),
    impact: z.string().optional().describe('Impact of the problem. Example: "1" (High), "2" (Medium), "3" (Low)'),
    urgency: z.string().optional().describe('Urgency of the problem. Example: "1" (High), "2" (Medium), "3" (Low)'),
    category: z.string().optional().describe('Category of the problem. Example: "Software"'),
    subcategory: z.string().optional().describe('Subcategory of the problem'),
    state: z.string().optional().describe('State of the problem. Example: "1" (Open), "2" (Known Error), etc.'),
    assigned_to: z.string().optional().describe('Sys ID of the user assigned to the problem'),
    assignment_group: z.string().optional().describe('Sys ID of the assignment group')
});

const ProviderProblemSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    short_description: z.string().optional(),
    description: z.string().nullable().optional(),
    impact: z.string().nullable().optional(),
    urgency: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    subcategory: z.string().nullable().optional(),
    assigned_to: z.string().nullable().optional(),
    assignment_group: z.string().nullable().optional(),
    sys_created_on: z.string().nullable().optional(),
    sys_updated_on: z.string().nullable().optional()
});

const OutputSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    priority: z.string().optional(),
    state: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    assigned_to: z.string().optional(),
    assignment_group: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional()
});

const ProviderResponseSchema = z.object({
    result: z.record(z.string(), z.unknown())
});

const action = createAction({
    description: 'Create a problem',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            short_description: input.short_description
        };
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.impact !== undefined) {
            data['impact'] = input.impact;
        }
        if (input.urgency !== undefined) {
            data['urgency'] = input.urgency;
        }
        if (input.category !== undefined) {
            data['category'] = input.category;
        }
        if (input.subcategory !== undefined) {
            data['subcategory'] = input.subcategory;
        }
        if (input.state !== undefined) {
            data['state'] = input.state;
        }
        if (input.assigned_to !== undefined) {
            data['assigned_to'] = input.assigned_to;
        }
        if (input.assignment_group !== undefined) {
            data['assignment_group'] = input.assignment_group;
        }

        // https://developer.servicenow.com/dev.do#!/reference/api/now/table/problem
        const response = await nango.post({
            endpoint: '/api/now/table/problem',
            data: data,
            retries: 1
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from ServiceNow: missing or malformed result field'
            });
        }

        const providerProblem = ProviderProblemSchema.parse(parsedResponse.data.result);

        return {
            sys_id: providerProblem.sys_id,
            number: providerProblem.number,
            ...(providerProblem.short_description !== undefined && { short_description: providerProblem.short_description }),
            ...(providerProblem.description != null && { description: providerProblem.description }),
            ...(providerProblem.impact != null && { impact: providerProblem.impact }),
            ...(providerProblem.urgency != null && { urgency: providerProblem.urgency }),
            ...(providerProblem.priority != null && { priority: providerProblem.priority }),
            ...(providerProblem.state != null && { state: providerProblem.state }),
            ...(providerProblem.category != null && { category: providerProblem.category }),
            ...(providerProblem.subcategory != null && { subcategory: providerProblem.subcategory }),
            ...(providerProblem.assigned_to != null && { assigned_to: providerProblem.assigned_to }),
            ...(providerProblem.assignment_group != null && { assignment_group: providerProblem.assignment_group }),
            ...(providerProblem.sys_created_on != null && { sys_created_on: providerProblem.sys_created_on }),
            ...(providerProblem.sys_updated_on != null && { sys_updated_on: providerProblem.sys_updated_on })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
