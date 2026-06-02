import { createSync } from 'nango';
import { z } from 'zod';

const TimeOffRequestSchema = z.object({
    id: z.string(),
    employeeId: z.string().optional(),
    status: z.string().optional(),
    statusLastChanged: z.string().optional(),
    name: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    created: z.string().optional(),
    timeOffTypeId: z.string().optional(),
    timeOffTypeName: z.string().optional(),
    amountUnit: z.string().optional(),
    amount: z.string().optional(),
    notesEmployee: z.string().optional(),
    notesManager: z.string().optional()
});

const ProviderStatusSchema = z
    .object({
        status: z.string().optional(),
        lastChanged: z.string().optional(),
        lastChangedByUserId: z.union([z.string(), z.number()]).optional()
    })
    .optional();

const ProviderTypeSchema = z
    .object({
        id: z.union([z.string(), z.number()]).optional(),
        name: z.string().optional(),
        icon: z.string().optional()
    })
    .optional();

const ProviderAmountSchema = z
    .object({
        unit: z.string().optional(),
        amount: z.union([z.string(), z.number()]).optional()
    })
    .optional();

const ProviderNotesSchema = z
    .object({
        employee: z.string().optional(),
        manager: z.string().optional()
    })
    .optional();

const ProviderTimeOffRequestSchema = z.object({
    id: z.union([z.string(), z.number()]),
    employeeId: z.union([z.string(), z.number()]).optional(),
    status: ProviderStatusSchema,
    name: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    created: z.string().optional(),
    type: ProviderTypeSchema,
    amount: ProviderAmountSchema,
    notes: ProviderNotesSchema
});

const ProviderResponseSchema = z.array(ProviderTimeOffRequestSchema);

const sync = createSync({
    description: 'Sync time off requests from BambooHR',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        TimeOffRequest: TimeOffRequestSchema
    },
    // https://documentation.bamboohr.com/reference/list-time-off-requests
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/time-off-requests'
        }
    ],

    exec: async (nango) => {
        const now = new Date();
        const startDate = `${now.getFullYear() - 5}-01-01`;
        const endDate = `${now.getFullYear() + 2}-12-31`;

        await nango.trackDeletesStart('TimeOffRequest');

        // https://documentation.bamboohr.com/reference/list-time-off-requests
        const response = await nango.get({
            endpoint: '/v1/time_off/requests',
            params: {
                start: startDate,
                end: endDate
            },
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error(`Failed to parse time off requests response: ${parsedResponse.error.message}`);
        }

        const requests = parsedResponse.data;

        const records = requests.map((req) => {
            return {
                id: String(req.id),
                ...(req.employeeId != null && { employeeId: String(req.employeeId) }),
                ...(req.status?.status != null && { status: req.status.status }),
                ...(req.status?.lastChanged != null && { statusLastChanged: req.status.lastChanged }),
                ...(req.name != null && { name: req.name }),
                ...(req.start != null && { start: req.start }),
                ...(req.end != null && { end: req.end }),
                ...(req.created != null && { created: req.created }),
                ...(req.type?.id != null && { timeOffTypeId: String(req.type.id) }),
                ...(req.type?.name != null && { timeOffTypeName: req.type.name }),
                ...(req.amount?.unit != null && { amountUnit: req.amount.unit }),
                ...(req.amount?.amount != null && { amount: String(req.amount.amount) }),
                ...(req.notes?.employee != null && { notesEmployee: req.notes.employee }),
                ...(req.notes?.manager != null && { notesManager: req.notes.manager })
            };
        });

        if (records.length > 0) {
            await nango.batchSave(records, 'TimeOffRequest');
        }

        await nango.trackDeletesEnd('TimeOffRequest');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
