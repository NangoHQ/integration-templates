import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        workerId: z.string().describe('The Workday worker ID to query time-off entries for. Example: "baf00a57d25f10098e0ac975d7070000"'),
        offset: z.number().int().min(0).optional().describe('Pagination offset for skipping results. Omit for the first page.'),
        limit: z.number().int().min(1).optional().describe('Maximum number of results to return per page.')
    })
    .describe("Input for listing a worker's time-off entries.");

const ProviderDescriptorSchema = z.object({
    id: z.string().optional(),
    descriptor: z.string().optional()
});

const ProviderTimeOffEntrySchema = z
    .object({
        timeOffEntryId: z.string().optional(),
        timeOffEventId: ProviderDescriptorSchema.optional(),
        worker: ProviderDescriptorSchema.optional(),
        date: z.string().optional(),
        timeOffType: ProviderDescriptorSchema.optional(),
        status: ProviderDescriptorSchema.optional(),
        quantity: z.string().optional(),
        unit: ProviderDescriptorSchema.optional(),
        comment: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        data: z.array(ProviderTimeOffEntrySchema).optional(),
        total: z.number().optional()
    })
    .passthrough();

const TimeOffEntrySchema = z.object({
    id: z.string().describe('Unique identifier for the time-off entry. Example: "827db9d515f610015100b890428f0000"'),
    workerId: z.string().describe('The Workday worker ID associated with this entry. Example: "baf00a57d25f10098e0ac975d7070000"'),
    date: z.string().optional().describe('The date of the time-off entry in ISO 8601 format. Example: "2024-09-16"'),
    timeOffType: z.string().optional().describe('The type of time off, such as "Basic Time Off" or "Sick Leave".'),
    status: z.string().optional().describe('The approval status of the time-off request, such as "Submitted", "Approved", or "Cancelled".'),
    quantity: z.string().optional().describe('The quantity of time-off units requested. Example: "8"'),
    unit: z.string().optional().describe('The unit of measurement for the time-off quantity, such as "Days" or "Hours".'),
    timeOffEventId: z.string().optional().describe('The Workday time-off event ID associated with this entry. Example: "827db9d515f610015100b62943010000"'),
    comment: z.string().optional().describe('Optional comment or note attached to the time-off request.')
});

const OutputSchema = z
    .object({
        items: z.array(TimeOffEntrySchema).describe('The list of time-off entries for the worker.'),
        nextOffset: z.number().optional().describe('The offset to use for the next page of results. Omit if there are no more pages.'),
        total: z.number().optional().describe('The total number of time-off entries available for this worker.')
    })
    .describe("Output containing a worker's time-off entries and pagination metadata.");

/**
 * @tags: [read]
 * @tagReason: Reads a worker's existing time-off/absence entries from Workday.
 * @pitfalls: The Workday API returns quantity as a string rather than a number, and each entry uses a single date with a quantity instead of a start and end date range.
 */
const action = createAction({
    description: "List a worker's time-off/absence entries.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config?.['tenant'];

        if (!tenant || typeof tenant !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_connection_config',
                message: 'Missing tenant in connection configuration.'
            });
        }

        const response = await nango.get({
            // https://community.workday.com/api (gated), referenced via third-party docs: GET absenceManagement/v4/workers/{id}/timeOffDetails
            endpoint: `absenceManagement/v4/${encodeURIComponent(tenant)}/workers/${encodeURIComponent(input.workerId)}/timeOffDetails`,
            params: {
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = (providerResponse.data || [])
            .filter((entry): entry is typeof entry & { timeOffEntryId: string } => Boolean(entry.timeOffEntryId))
            .map((entry) => {
                return {
                    id: entry.timeOffEntryId,
                    workerId: entry.worker?.id || input.workerId,
                    ...(entry.date !== undefined && { date: entry.date }),
                    ...(entry.timeOffType?.descriptor !== undefined && { timeOffType: entry.timeOffType.descriptor }),
                    ...(entry.status?.descriptor !== undefined && { status: entry.status.descriptor }),
                    ...(entry.quantity !== undefined && { quantity: entry.quantity }),
                    ...(entry.unit?.descriptor !== undefined && { unit: entry.unit.descriptor }),
                    ...(entry.timeOffEventId?.id !== undefined && { timeOffEventId: entry.timeOffEventId.id }),
                    ...(entry.comment !== undefined && { comment: entry.comment })
                };
            });

        const nextOffset =
            providerResponse.total !== undefined && items.length > 0 ? (input.offset ?? 0) + items.length : undefined;

        const hasMore = nextOffset !== undefined && providerResponse.total !== undefined && nextOffset < providerResponse.total;

        return {
            items,
            ...(hasMore && nextOffset !== undefined && { nextOffset: nextOffset }),
            ...(providerResponse.total !== undefined && { total: providerResponse.total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
