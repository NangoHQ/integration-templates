import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    requestId: z.number().int().describe('The time off request ID. Example: 1348')
});

const RawStatusSchema = z.object({
    lastChanged: z.string().optional(),
    lastChangedByUserId: z.string().optional(),
    status: z.string().optional()
});

const RawTypeSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    icon: z.string().optional()
});

const RawAmountSchema = z.object({
    unit: z.string().optional(),
    amount: z.string().optional()
});

const RawActionsSchema = z.object({
    view: z.boolean().optional(),
    edit: z.boolean().optional(),
    cancel: z.boolean().optional(),
    approve: z.boolean().optional(),
    deny: z.boolean().optional(),
    bypass: z.boolean().optional()
});

const RawNotesSchema = z.object({
    employee: z.string().optional(),
    manager: z.string().optional()
});

const RawTimeOffRequestSchema = z.object({
    id: z.string(),
    employeeId: z.string().optional(),
    name: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    created: z.string().optional(),
    status: RawStatusSchema.optional(),
    type: RawTypeSchema.optional(),
    amount: RawAmountSchema.optional(),
    actions: RawActionsSchema.optional(),
    dates: z.record(z.string(), z.string()).optional(),
    notes: RawNotesSchema.optional()
});

const StatusSchema = z.object({
    lastChanged: z.string().optional(),
    lastChangedByUserId: z.number().int().optional(),
    status: z.string().optional()
});

const TypeSchema = z.object({
    id: z.number().int().optional(),
    name: z.string().optional(),
    icon: z.string().optional()
});

const AmountSchema = z.object({
    unit: z.string().optional(),
    amount: z.number().optional()
});

const ActionsSchema = z.object({
    view: z.boolean().optional(),
    edit: z.boolean().optional(),
    cancel: z.boolean().optional(),
    approve: z.boolean().optional(),
    deny: z.boolean().optional(),
    bypass: z.boolean().optional()
});

const NotesSchema = z.object({
    employee: z.string().optional(),
    manager: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number().int(),
    employeeId: z.number().int().optional(),
    name: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    created: z.string().optional(),
    status: StatusSchema.optional(),
    type: TypeSchema.optional(),
    amount: AmountSchema.optional(),
    actions: ActionsSchema.optional(),
    dates: z.record(z.string(), z.number()).optional(),
    notes: NotesSchema.optional()
});

function parseOptionalInt(value: string | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        return undefined;
    }
    return parsed;
}

const action = createAction({
    description: 'Retrieve a single time off request from BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-time-off-request',
        group: 'Time Off'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['time_off'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.bamboohr.com/reference/list-time-off-requests
        const response = await nango.get({
            endpoint: 'v1/time_off/requests',
            params: {
                id: String(input.requestId),
                start: '1900-01-01',
                end: '2100-12-31'
            },
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const parsed = z.array(RawTimeOffRequestSchema).parse(response.data);

        const rawRequest = parsed[0];

        if (!rawRequest) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Time off request not found',
                requestId: input.requestId
            });
        }

        return {
            id: parseInt(rawRequest.id, 10),
            employeeId: parseOptionalInt(rawRequest.employeeId),
            name: rawRequest.name,
            start: rawRequest.start,
            end: rawRequest.end,
            created: rawRequest.created,
            status: rawRequest.status
                ? {
                      lastChanged: rawRequest.status.lastChanged,
                      lastChangedByUserId: parseOptionalInt(rawRequest.status.lastChangedByUserId),
                      status: rawRequest.status.status
                  }
                : undefined,
            type: rawRequest.type
                ? {
                      id: parseOptionalInt(rawRequest.type.id),
                      name: rawRequest.type.name,
                      icon: rawRequest.type.icon
                  }
                : undefined,
            amount: rawRequest.amount
                ? {
                      unit: rawRequest.amount.unit,
                      amount: parseOptionalInt(rawRequest.amount.amount)
                  }
                : undefined,
            actions: rawRequest.actions,
            dates: rawRequest.dates ? Object.fromEntries(Object.entries(rawRequest.dates).map(([date, amount]) => [date, parseInt(amount, 10)])) : undefined,
            notes: rawRequest.notes
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
