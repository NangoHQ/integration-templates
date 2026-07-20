import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    change_request: z.string().describe('Sys ID of the parent change_request. Example: "ff3687b9c3ca0310c5a8fc0d05013101"'),
    short_description: z.string().optional().describe('Short description of the change task'),
    description: z.string().optional().describe('Detailed description of the change task'),
    state: z.string().optional().describe('State of the change task. Example: "2" for In Progress'),
    assigned_to: z.string().optional().describe('Sys ID of the user assigned to the task'),
    assignment_group: z.string().optional().describe('Sys ID of the group assigned to the task'),
    impact: z.string().optional().describe('Impact of the task. Example: "3" for Low'),
    urgency: z.string().optional().describe('Urgency of the task. Example: "3" for Low')
});

const StringOrRefObjectSchema = z.union([z.string(), z.object({ value: z.string() }), z.object({ link: z.string(), value: z.string() })]);

const ProviderResponseSchema = z.object({
    result: z.unknown()
});

const ProviderResultSchema = z.object({
    sys_id: z.string(),
    number: z.string().optional(),
    change_request: StringOrRefObjectSchema.optional(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional(),
    assigned_to: StringOrRefObjectSchema.optional(),
    assignment_group: StringOrRefObjectSchema.optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    priority: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional()
});

const OutputSchema = z.object({
    sys_id: z.string(),
    number: z.string().optional(),
    change_request: z.string().optional(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional(),
    assigned_to: z.string().optional(),
    assignment_group: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    priority: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional()
});

function extractStringValue(value: z.infer<typeof StringOrRefObjectSchema> | undefined): string | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value === 'string') {
        return value;
    }
    return value.value;
}

const action = createAction({
    description: 'Create a change task under a change request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/change_task
            endpoint: '/api/now/table/change_task',
            data: {
                change_request: input.change_request,
                ...(input.short_description !== undefined && { short_description: input.short_description }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.state !== undefined && { state: input.state }),
                ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
                ...(input.assignment_group !== undefined && { assignment_group: input.assignment_group }),
                ...(input.impact !== undefined && { impact: input.impact }),
                ...(input.urgency !== undefined && { urgency: input.urgency })
            },
            retries: 1
        });

        const rawResponse = ProviderResponseSchema.parse(response.data);
        const providerResult = ProviderResultSchema.parse(rawResponse.result);

        return {
            sys_id: providerResult.sys_id,
            ...(providerResult.number !== undefined && { number: providerResult.number }),
            ...(providerResult.change_request !== undefined && { change_request: extractStringValue(providerResult.change_request) }),
            ...(providerResult.short_description !== undefined && { short_description: providerResult.short_description }),
            ...(providerResult.description !== undefined && { description: providerResult.description }),
            ...(providerResult.state !== undefined && { state: providerResult.state }),
            ...(providerResult.assigned_to !== undefined && { assigned_to: extractStringValue(providerResult.assigned_to) }),
            ...(providerResult.assignment_group !== undefined && { assignment_group: extractStringValue(providerResult.assignment_group) }),
            ...(providerResult.impact !== undefined && { impact: providerResult.impact }),
            ...(providerResult.urgency !== undefined && { urgency: providerResult.urgency }),
            ...(providerResult.priority !== undefined && { priority: providerResult.priority }),
            ...(providerResult.sys_created_on !== undefined && { sys_created_on: providerResult.sys_created_on }),
            ...(providerResult.sys_updated_on !== undefined && { sys_updated_on: providerResult.sys_updated_on })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
