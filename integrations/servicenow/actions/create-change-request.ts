import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    short_description: z.string().describe('Short description of the change request. Example: "Upgrade server hardware"'),
    type: z.enum(['standard', 'normal', 'emergency']).describe('Type of change request. Must be standard, normal, or emergency.'),
    description: z.string().optional().describe('Detailed description of the change request.'),
    impact: z.string().optional().describe('Impact of the change request. Example: "1"'),
    urgency: z.string().optional().describe('Urgency of the change request. Example: "1"'),
    category: z.string().optional().describe('Category of the change request. Example: "Hardware"'),
    risk: z.string().optional().describe('Risk level of the change request. Example: "low"'),
    state: z.string().optional().describe('State of the change request. Example: "1" for Open.'),
    assignment_group: z.string().optional().describe('Sys ID of the assignment group. Example: "284687b9c3ca0310c5a8fc0d05013151"'),
    assigned_to: z.string().optional().describe('Sys ID of the user assigned to the change request. Example: "4896c3f9c3ca0310c5a8fc0d05013151"'),
    cmdb_ci: z.string().optional().describe('Sys ID of the configuration item. Example: "..."'),
    reason: z.string().optional().describe('Reason for the change request.'),
    start_date: z.string().optional().describe('Planned start date in instance timezone. Example: "2026-07-15 08:00:00"'),
    end_date: z.string().optional().describe('Planned end date in instance timezone. Example: "2026-07-15 17:00:00"')
});

const ProviderChangeRequestSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    short_description: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    category: z.string().optional(),
    risk: z.string().optional(),
    state: z.string().optional(),
    assignment_group: z.string().optional(),
    assigned_to: z.string().optional(),
    cmdb_ci: z.string().optional(),
    reason: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional()
});

const OutputSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    short_description: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    category: z.string().optional(),
    risk: z.string().optional(),
    state: z.string().optional(),
    assignment_group: z.string().optional(),
    assigned_to: z.string().optional(),
    cmdb_ci: z.string().optional(),
    reason: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional()
});

const action = createAction({
    description: 'Create a change request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.servicenow.com/dev.do#!/reference/api
            endpoint: '/api/now/table/change_request',
            data: {
                short_description: input.short_description,
                type: input.type,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.impact !== undefined && { impact: input.impact }),
                ...(input.urgency !== undefined && { urgency: input.urgency }),
                ...(input.category !== undefined && { category: input.category }),
                ...(input.risk !== undefined && { risk: input.risk }),
                ...(input.state !== undefined && { state: input.state }),
                ...(input.assignment_group !== undefined && { assignment_group: input.assignment_group }),
                ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
                ...(input.cmdb_ci !== undefined && { cmdb_ci: input.cmdb_ci }),
                ...(input.reason !== undefined && { reason: input.reason }),
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.end_date !== undefined && { end_date: input.end_date })
            },
            retries: 1
        });

        const parsedResponse = z.object({ result: z.unknown() }).safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from ServiceNow when creating change request.'
            });
        }

        const providerChangeRequest = ProviderChangeRequestSchema.parse(parsedResponse.data.result);

        return {
            sys_id: providerChangeRequest.sys_id,
            number: providerChangeRequest.number,
            ...(providerChangeRequest.short_description !== undefined && { short_description: providerChangeRequest.short_description }),
            ...(providerChangeRequest.type !== undefined && { type: providerChangeRequest.type }),
            ...(providerChangeRequest.description !== undefined && { description: providerChangeRequest.description }),
            ...(providerChangeRequest.impact !== undefined && { impact: providerChangeRequest.impact }),
            ...(providerChangeRequest.urgency !== undefined && { urgency: providerChangeRequest.urgency }),
            ...(providerChangeRequest.category !== undefined && { category: providerChangeRequest.category }),
            ...(providerChangeRequest.risk !== undefined && { risk: providerChangeRequest.risk }),
            ...(providerChangeRequest.state !== undefined && { state: providerChangeRequest.state }),
            ...(providerChangeRequest.assignment_group !== undefined && { assignment_group: providerChangeRequest.assignment_group }),
            ...(providerChangeRequest.assigned_to !== undefined && { assigned_to: providerChangeRequest.assigned_to }),
            ...(providerChangeRequest.cmdb_ci !== undefined && { cmdb_ci: providerChangeRequest.cmdb_ci }),
            ...(providerChangeRequest.reason !== undefined && { reason: providerChangeRequest.reason }),
            ...(providerChangeRequest.start_date !== undefined && { start_date: providerChangeRequest.start_date }),
            ...(providerChangeRequest.end_date !== undefined && { end_date: providerChangeRequest.end_date }),
            ...(providerChangeRequest.sys_created_on !== undefined && { sys_created_on: providerChangeRequest.sys_created_on }),
            ...(providerChangeRequest.sys_updated_on !== undefined && { sys_updated_on: providerChangeRequest.sys_updated_on })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
