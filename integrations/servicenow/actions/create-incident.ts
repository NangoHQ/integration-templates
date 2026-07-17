import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    short_description: z.string().describe('Short description of the incident. Example: "Unable to access email"'),
    description: z.string().optional().describe('Detailed description of the incident'),
    impact: z.string().optional().describe('Impact of the incident. Example: "1" (High), "2" (Medium), "3" (Low)'),
    urgency: z.string().optional().describe('Urgency of the incident. Example: "1" (High), "2" (Medium), "3" (Low)'),
    caller_id: z.string().optional().describe('Sys ID of the caller. Example: "4896c3f9c3ca0310c5a8fc0d05013151"'),
    category: z.string().optional().describe('Category of the incident'),
    subcategory: z.string().optional().describe('Subcategory of the incident'),
    assigned_to: z.string().optional().describe('Sys ID of the assigned user'),
    assignment_group: z.string().optional().describe('Sys ID of the assignment group'),
    state: z.string().optional().describe('State of the incident. Example: "1" (New), "2" (In Progress)')
});

const ProviderIncidentSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    short_description: z.string(),
    description: z.string().nullable().optional(),
    impact: z.string().nullable().optional(),
    urgency: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    sys_created_on: z.string().nullable().optional(),
    sys_updated_on: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    result: ProviderIncidentSchema
});

const OutputSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    short_description: z.string(),
    description: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    priority: z.string().optional(),
    state: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional()
});

const action = createAction({
    description: 'Create an incident',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/incident
            endpoint: '/api/now/table/incident',
            data: {
                short_description: input.short_description,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.impact !== undefined && { impact: input.impact }),
                ...(input.urgency !== undefined && { urgency: input.urgency }),
                ...(input.caller_id !== undefined && { caller_id: input.caller_id }),
                ...(input.category !== undefined && { category: input.category }),
                ...(input.subcategory !== undefined && { subcategory: input.subcategory }),
                ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
                ...(input.assignment_group !== undefined && { assignment_group: input.assignment_group }),
                ...(input.state !== undefined && { state: input.state })
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerResult = providerResponse.result;

        return {
            sys_id: providerResult.sys_id,
            number: providerResult.number,
            short_description: providerResult.short_description,
            ...(providerResult.description != null && { description: providerResult.description }),
            ...(providerResult.impact != null && { impact: providerResult.impact }),
            ...(providerResult.urgency != null && { urgency: providerResult.urgency }),
            ...(providerResult.priority != null && { priority: providerResult.priority }),
            ...(providerResult.state != null && { state: providerResult.state }),
            ...(providerResult.sys_created_on != null && { sys_created_on: providerResult.sys_created_on }),
            ...(providerResult.sys_updated_on != null && { sys_updated_on: providerResult.sys_updated_on })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
