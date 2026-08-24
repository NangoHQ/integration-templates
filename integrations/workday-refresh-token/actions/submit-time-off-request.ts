import { z } from 'zod';
import { createAction } from 'nango';

const DailyQuantitySchema = z.object({
    date: z.string().describe('Date of the time off entry in YYYY-MM-DD format. Example: "2026-08-21"'),
    quantity: z.number().describe('Quantity of time off for this date, typically in days or hours depending on the plan. Example: 1')
});

const InputSchema = z
    .object({
        worker_id: z.string().describe('Workday ID of the worker submitting the request. Example: "b8ef48a7f8281005df6b2ecc263b0000"'),
        time_off_type_id: z.string().describe('Workday ID of the time off type (absence type). Example: "cf13fdec453b1001a3e7e257d7e90000"'),
        start_date: z.string().describe('Start date of the time off request in YYYY-MM-DD format. Example: "2026-08-21"'),
        end_date: z.string().describe('End date of the time off request in YYYY-MM-DD format. Example: "2026-08-22"'),
        daily_quantity: z.number().optional().describe('Default quantity for each day in the range. If omitted, defaults to 1.'),
        daily_quantities: z
            .array(DailyQuantitySchema)
            .optional()
            .describe('Per-day quantity overrides. When provided, the quantity for a matching date overrides the default daily_quantity.'),
        comment: z.string().optional().describe('Optional comment attached to every day in the request. Example: "Going to a wedding"'),
        reason_id: z.string().optional().describe('Optional Workday ID of the absence reason applied to every day. Example: "a1b08afc53614c37b32b31270bb8bee3"')
    })
    .describe('Input to submit a new time off request for a worker');

const TimeOffTypeSchema = z.object({
    id: z.string().optional().describe('Workday ID of the time off type.'),
    descriptor: z.string().optional().describe('Human-readable name of the time off type.')
});

const ProviderDaySchema = z.object({
    id: z.string().optional(),
    descriptor: z.string().optional(),
    date: z.string().optional(),
    dailyQuantity: z.union([z.string(), z.number()]).optional(),
    comment: z.string().optional(),
    timeOffType: TimeOffTypeSchema.optional()
});

const ProviderBusinessProcessSchema = z.object({
    overallBusinessProcess: z
        .object({
            id: z.string().optional(),
            descriptor: z.string().optional()
        })
        .optional(),
    transactionStatus: z
        .object({
            id: z.string().optional(),
            descriptor: z.string().optional()
        })
        .optional(),
    overallStatus: z.string().optional(),
    for: z
        .object({
            id: z.string().optional(),
            descriptor: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z
    .object({
        days: z.array(ProviderDaySchema).optional(),
        businessProcessParameters: ProviderBusinessProcessSchema.optional()
    })
    .passthrough();

const OutputDaySchema = z.object({
    id: z.string().describe('Workday ID of the individual time off day entry.'),
    date: z.string().optional().describe('Date of the time off entry.'),
    daily_quantity: z.string().optional().describe('Quantity of time off for this day.'),
    comment: z.string().optional().describe('Comment for this day entry.'),
    time_off_type: TimeOffTypeSchema.optional().describe('Time off type for this day entry.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Workday ID of the submitted time off request business process.'),
        descriptor: z.string().optional().describe('Human-readable description of the submitted request.'),
        status: z.string().optional().describe('Current overall status of the request, such as "In Progress" or "Submitted".'),
        days: z.array(OutputDaySchema).optional().describe('Individual day entries created by the request.')
    })
    .describe('Output of a submitted time off request');

/**
 * @tags: [write]
 * @tagReason: Submits a new time off request to Workday, which initiates a business process.
 * @pitfalls: The action initiates a business process so the returned status is In Progress, not a final approval. Time off type IDs must be valid for the specific worker. The returned days array is not guaranteed to be chronological. daily_quantity is returned as a string despite numeric input.
 */
const action = createAction({
    description: 'Submit a new time-off request for a worker',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let tenant = connection.connection_config?.['tenant'];
        if (!tenant || typeof tenant !== 'string') {
            const metadata = await nango.getMetadata();
            tenant = metadata?.['tenant'];
        }
        if (!tenant || typeof tenant !== 'string') {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Tenant is missing in connection configuration.'
            });
        }

        const quantityOverrides = new Map<string, number>();
        if (input.daily_quantities !== undefined) {
            for (const dq of input.daily_quantities) {
                quantityOverrides.set(dq.date, dq.quantity);
            }
        }

        const days: Record<string, unknown>[] = [];
        const start = new Date(input.start_date + 'T00:00:00Z');
        const end = new Date(input.end_date + 'T00:00:00Z');
        const isValidDate = (value: string, date: Date) =>
            /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
        if (!isValidDate(input.start_date, start) || !isValidDate(input.end_date, end) || start > end) {
            throw new nango.ActionError({
                type: 'invalid_dates',
                message: 'start_date and end_date must be valid YYYY-MM-DD dates, with start_date on or before end_date.'
            });
        }

        const MAX_DAYS_PER_REQUEST = 366;
        const dayCount = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        if (dayCount > MAX_DAYS_PER_REQUEST) {
            throw new nango.ActionError({
                type: 'invalid_dates',
                message: `Date range cannot exceed ${MAX_DAYS_PER_REQUEST} days.`
            });
        }

        for (let current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
            const dateStr = current.toISOString().slice(0, 10);
            const dayEntry: Record<string, unknown> = {
                date: dateStr,
                dailyQuantity: quantityOverrides.get(dateStr) ?? input.daily_quantity ?? 1,
                timeOffType: {
                    id: input.time_off_type_id
                }
            };
            if (input.comment !== undefined) {
                dayEntry['comment'] = input.comment;
            }
            if (input.reason_id !== undefined) {
                dayEntry['reason'] = {
                    id: input.reason_id
                };
            }
            days.push(dayEntry);
        }

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html
        const response = await nango.post({
            endpoint: `absenceManagement/v4/${encodeURIComponent(tenant)}/workers/${encodeURIComponent(input.worker_id)}/requestTimeOff`,
            data: { days },
            // Non-idempotent write with no idempotency key support: a retry after a lost response could create a duplicate
            // time-off business process, so retries must stay disabled despite the lint rule's default-positive-integer preference.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Workday.',
                details: parsed.error.message
            });
        }

        const data = parsed.data;
        const bp = data.businessProcessParameters;
        const businessProcessId = bp?.overallBusinessProcess?.id;

        if (!businessProcessId) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Workday did not return a business process id for the submitted time off request.'
            });
        }

        return {
            id: businessProcessId,
            ...(bp?.overallBusinessProcess?.descriptor !== undefined && { descriptor: bp.overallBusinessProcess.descriptor }),
            ...(bp?.overallStatus !== undefined && { status: bp.overallStatus }),
            ...(data.days !== undefined && {
                days: data.days.map((day) => ({
                    id: day.id ?? '',
                    ...(day.date !== undefined && { date: day.date }),
                    ...(day.dailyQuantity !== undefined && {
                        daily_quantity: typeof day.dailyQuantity === 'number' ? String(day.dailyQuantity) : day.dailyQuantity
                    }),
                    ...(day.comment !== undefined && { comment: day.comment }),
                    ...(day.timeOffType !== undefined && { time_off_type: day.timeOffType })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
