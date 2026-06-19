import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start: z.string().describe('Start date filter. Only include requests that end on or after this date. YYYY-MM-DD format. Example: "2026-01-01"'),
    end: z.string().describe('End date filter. Only include requests that start on or before this date. YYYY-MM-DD format. Example: "2026-12-31"'),
    id: z.number().optional().describe('A particular request ID to limit the response to.'),
    action: z
        .enum(['view', 'approve', 'myRequests'])
        .optional()
        .describe('Limit to requests the caller can view, approve, or only their own requests. Defaults to view.'),
    employeeId: z.number().optional().describe('A particular employee ID to limit the response to.'),
    type: z.string().optional().describe('A comma-separated list of time off type IDs to filter by.'),
    status: z
        .string()
        .optional()
        .describe('A comma-separated list of request status values to filter by. Accepted values are approved, denied, superceded, requested, and canceled.'),
    excludeNote: z.string().optional().describe('When set to any truthy value, omits the notes object from each request in the response.')
});

const ProviderStatusSchema = z.object({
    status: z.string(),
    lastChanged: z.string().optional(),
    lastChangedByUserId: z.string().optional()
});

const ProviderTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().optional()
});

const ProviderAmountSchema = z.object({
    unit: z.string(),
    amount: z.string()
});

const ProviderActionsSchema = z.object({
    view: z.boolean().optional(),
    edit: z.boolean().optional(),
    cancel: z.boolean().optional(),
    approve: z.boolean().optional(),
    deny: z.boolean().optional(),
    bypass: z.boolean().optional()
});

const ProviderTimeOffRequestSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    status: ProviderStatusSchema,
    name: z.string(),
    start: z.string(),
    end: z.string(),
    created: z.string().optional(),
    type: ProviderTypeSchema,
    amount: ProviderAmountSchema,
    actions: ProviderActionsSchema.optional(),
    dates: z.record(z.string(), z.string()).optional(),
    notes: z.record(z.string(), z.string().nullable()).optional()
});

const ProviderResponseSchema = z.array(ProviderTimeOffRequestSchema);

const TimeOffRequestSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    status: z.object({
        status: z.string(),
        lastChanged: z.string().optional(),
        lastChangedByUserId: z.string().optional()
    }),
    name: z.string(),
    start: z.string(),
    end: z.string(),
    created: z.string().optional(),
    type: z.object({
        id: z.string(),
        name: z.string(),
        icon: z.string().optional()
    }),
    amount: z.object({
        unit: z.string(),
        amount: z.string()
    }),
    actions: z
        .object({
            view: z.boolean().optional(),
            edit: z.boolean().optional(),
            cancel: z.boolean().optional(),
            approve: z.boolean().optional(),
            deny: z.boolean().optional(),
            bypass: z.boolean().optional()
        })
        .optional(),
    dates: z.record(z.string(), z.string()).optional(),
    notes: z.record(z.string(), z.string().nullable()).optional()
});

const OutputSchema = z.object({
    items: z.array(TimeOffRequestSchema)
});

const action = createAction({
    description: 'List time off requests from BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-time-off-requests
            endpoint: '/v1/time_off/requests',
            params: {
                start: input.start,
                end: input.end,
                ...(input.id !== undefined && { id: String(input.id) }),
                ...(input.action !== undefined && { action: input.action }),
                ...(input.employeeId !== undefined && { employeeId: String(input.employeeId) }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.excludeNote !== undefined && { excludeNote: input.excludeNote })
            },
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            items: providerData.map((item) => ({
                id: item.id,
                employeeId: item.employeeId,
                status: {
                    status: item.status.status,
                    ...(item.status.lastChanged !== undefined && { lastChanged: item.status.lastChanged }),
                    ...(item.status.lastChangedByUserId !== undefined && { lastChangedByUserId: item.status.lastChangedByUserId })
                },
                name: item.name,
                start: item.start,
                end: item.end,
                ...(item.created !== undefined && { created: item.created }),
                type: {
                    id: item.type.id,
                    name: item.type.name,
                    ...(item.type.icon !== undefined && { icon: item.type.icon })
                },
                amount: {
                    unit: item.amount.unit,
                    amount: item.amount.amount
                },
                ...(item.actions !== undefined && {
                    actions: {
                        ...(item.actions.view !== undefined && { view: item.actions.view }),
                        ...(item.actions.edit !== undefined && { edit: item.actions.edit }),
                        ...(item.actions.cancel !== undefined && { cancel: item.actions.cancel }),
                        ...(item.actions.approve !== undefined && { approve: item.actions.approve }),
                        ...(item.actions.deny !== undefined && { deny: item.actions.deny }),
                        ...(item.actions.bypass !== undefined && { bypass: item.actions.bypass })
                    }
                }),
                ...(item.dates !== undefined && { dates: item.dates }),
                ...(item.notes !== undefined && { notes: item.notes })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
