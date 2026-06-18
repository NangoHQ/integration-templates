import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('Employee ID. Example: "123"'),
    start: z.string().describe('Start date in YYYY-MM-DD format. Example: "2024-01-01"'),
    end: z.string().describe('End date in YYYY-MM-DD format. Example: "2024-01-31"'),
    cursor: z.string().optional().describe('Pagination cursor. Not used by this API.')
});

const OutputEntrySchema = z.object({
    id: z.string(),
    employeeId: z.string().optional(),
    type: z.string().optional(),
    date: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    timezone: z.string().optional(),
    hours: z.number().optional(),
    note: z.string().optional(),
    projectId: z.string().optional(),
    taskId: z.string().optional(),
    approved: z.boolean().optional(),
    approvedAt: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputEntrySchema),
    nextCursor: z.string().optional()
});

const ProviderEntrySchema = z.object({
    id: z.unknown().transform((v) => String(v)),
    employeeId: z
        .unknown()
        .transform((v) => String(v))
        .optional(),
    type: z.string().optional(),
    date: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    timezone: z.string().optional(),
    hours: z.number().optional(),
    note: z.string().optional(),
    projectId: z
        .unknown()
        .transform((v) => String(v))
        .optional(),
    taskId: z
        .unknown()
        .transform((v) => String(v))
        .optional(),
    approved: z.boolean().optional(),
    approvedAt: z.string().optional()
});

const action = createAction({
    description: 'List time tracking entries for an employee in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-timesheet-entries
            endpoint: '/v1/time_tracking/timesheet_entries',
            params: {
                start: input.start,
                end: input.end,
                employeeIds: input.employeeId
            },
            retries: 3
        });

        const raw = response.data;

        let entries: unknown[] = [];
        if (Array.isArray(raw)) {
            entries = raw;
        } else if (raw != null && typeof raw === 'object') {
            for (const value of Object.values(raw)) {
                if (Array.isArray(value)) {
                    for (const item of value) {
                        entries.push(item);
                    }
                }
            }
        }

        const parsed = z.array(ProviderEntrySchema).safeParse(entries);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from BambooHR API',
                errors: parsed.error.issues
            });
        }

        return {
            items: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
