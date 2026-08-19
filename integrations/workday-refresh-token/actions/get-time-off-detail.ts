import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        workerId: z.string().describe('The unique identifier of the worker whose time-off detail is being retrieved.'),
        timeOffDetailId: z.string().describe('The unique identifier of the specific time-off detail entry to retrieve.')
    })
    .describe('Input parameters for retrieving a single Workday time-off detail.');

const MetadataSchema = z.object({
    tenant: z.string().optional().describe('The Workday tenant identifier from connection metadata.')
});

const WorkdayReferenceSchema = z.object({
    id: z.string().optional().describe('The unique identifier of the referenced resource.'),
    descriptor: z.string().optional().describe('A human-readable name or description of the referenced resource.')
});

const OutputSchema = z
    .object({
        timeOffEntryId: z.string().describe('The unique identifier for this time-off detail entry.'),
        timeOffType: WorkdayReferenceSchema.optional().describe('The type of time off (e.g., Basic Time Off, Annual Leave).'),
        timeOffEventId: WorkdayReferenceSchema.optional().describe('The parent time-off event associated with this detail.'),
        worker: WorkdayReferenceSchema.optional().describe('The worker associated with this time-off detail.'),
        status: WorkdayReferenceSchema.optional().describe('The current status of the time-off request (e.g., Submitted, Approved).'),
        date: z.string().optional().describe('The date of the time-off entry. Format: YYYY-MM-DD.'),
        comment: z.string().optional().describe('An optional comment associated with the time-off request.'),
        unit: WorkdayReferenceSchema.optional().describe('The unit of measurement for the time-off quantity (e.g., Days, Hours).'),
        quantity: z.string().optional().describe('The quantity of time off requested in the specified unit.')
    })
    .passthrough()
    .describe('Output shape for a single Workday time-off detail entry.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single time-off detail from Workday without modifying provider data.
 * @pitfalls: The root response does not include an `id` field; the entry identifier is `timeOffEntryId`. `quantity` is returned as a string rather than a number.
 */
const action = createAction({
    description: "Get a single time-off entry's details.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input) => {
        const metadata = await nango.getMetadata();
        const tenant = metadata.tenant;

        if (typeof tenant !== 'string' || tenant.length === 0) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Tenant is missing in connection metadata.'
            });
        }

        const response = await nango.get({
            // https://community.workday.com/api/reference/absence-management/get-time-off-details
            endpoint: `absenceManagement/v4/${tenant}/workers/${encodeURIComponent(input.workerId)}/timeOffDetails/${encodeURIComponent(input.timeOffDetailId)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Time-off detail not found or empty response received.',
                workerId: input.workerId,
                timeOffDetailId: input.timeOffDetailId
            });
        }

        const parsed = OutputSchema.parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
