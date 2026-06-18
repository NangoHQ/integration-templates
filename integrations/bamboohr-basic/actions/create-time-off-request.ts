import { z } from 'zod';
import { createAction } from 'nango';

const NoteSchema = z.object({
    employee: z.string().optional(),
    manager: z.string().optional()
});

const InputSchema = z.object({
    employeeId: z.number().describe('The ID of the employee to create the time off request for. Example: 123'),
    status: z.union([z.literal('approved'), z.literal('denied'), z.literal('declined'), z.literal('requested')]).describe('The initial status of the request.'),
    start: z.string().describe('Start date in YYYY-MM-DD format. Example: 2026-04-15'),
    end: z.string().describe('End date in YYYY-MM-DD format. Must be on or after the start date. Example: 2026-04-18'),
    timeOffTypeId: z.number().describe('The ID of the time off type for this request. Example: 1'),
    amount: z.number().optional().describe('Total hours or days requested. Ignored when dates is provided.'),
    previousRequest: z.number().optional().describe('The ID of a previous time off request to supersede.'),
    notes: NoteSchema.optional().describe('Optional notes from the employee or manager.'),
    dates: z.record(z.string(), z.string()).optional().describe('Optional per-day breakdown mapping YYYY-MM-DD to amount.')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    status: z.object({
        status: z.string(),
        lastChanged: z.string().optional(),
        lastChangedByUserId: z.string().optional()
    }),
    name: z.string().optional(),
    start: z.string(),
    end: z.string(),
    type: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    amount: z
        .object({
            unit: z.string(),
            amount: z.string()
        })
        .optional(),
    notes: z.array(z.record(z.string(), z.string())).optional(),
    dates: z.record(z.string(), z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    status: z.string(),
    start: z.string(),
    end: z.string(),
    timeOffTypeId: z.string().optional(),
    timeOffTypeName: z.string().optional(),
    name: z.string().optional(),
    amount: z
        .object({
            unit: z.string(),
            amount: z.string()
        })
        .optional(),
    notes: z.array(z.record(z.string(), z.string())).optional(),
    dates: z.record(z.string(), z.string()).optional()
});

const action = createAction({
    description: 'Create a time off request in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://documentation.bamboohr.com/reference/create-time-off-request
            endpoint: `/v1/employees/${encodeURIComponent(input.employeeId)}/time_off/request`,
            headers: {
                Accept: 'application/json'
            },
            data: {
                status: input.status,
                start: input.start,
                end: input.end,
                timeOffTypeId: input.timeOffTypeId,
                ...(input.amount !== undefined && { amount: input.amount }),
                ...(input.previousRequest !== undefined && { previousRequest: input.previousRequest }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.dates !== undefined && { dates: input.dates })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            employeeId: providerResponse.employeeId,
            status: providerResponse.status.status,
            start: providerResponse.start,
            end: providerResponse.end,
            ...(providerResponse.type?.id !== undefined && { timeOffTypeId: providerResponse.type.id }),
            ...(providerResponse.type?.name !== undefined && { timeOffTypeName: providerResponse.type.name }),
            ...(providerResponse.name !== undefined && { name: providerResponse.name }),
            ...(providerResponse.amount !== undefined && { amount: providerResponse.amount }),
            ...(providerResponse.notes !== undefined && { notes: providerResponse.notes }),
            ...(providerResponse.dates !== undefined && { dates: providerResponse.dates })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
