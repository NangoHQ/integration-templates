import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DEFAULT_SELECT_FIELDS = [
    'subject',
    'description',
    'scheduledstart',
    'scheduledend',
    'location',
    'statecode',
    'statuscode',
    'prioritycode',
    'isalldayevent',
    'createdon',
    'modifiedon'
];

const InputSchema = z
    .object({
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Appointment attribute logical names to return (OData $select). Defaults to a core set of appointment fields; the primary key activityid is always returned. Example: ["subject", "scheduledstart", "scheduledend"]'
            ),
        filter: z.string().optional().describe('OData $filter expression restricting which appointments are returned. Example: "statecode eq 0"'),
        orderby: z.string().optional().describe('OData $orderby expression controlling sort order. Example: "scheduledstart desc"'),
        top: z.number().int().positive().optional().describe('Maximum number of appointments to return in this page (OData $top). Example: 50'),
        cursor: z
            .string()
            .optional()
            .describe(
                'Pagination cursor: the next_cursor value returned by a previous call. Omit for the first page. When set, the select/filter/orderby/top inputs are ignored.'
            )
    })
    .describe('Field selection, filters, and pagination options for listing Dataverse appointments.');

const RawAppointmentSchema = z
    .object({
        activityid: z.string(),
        subject: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        scheduledstart: z.string().nullable().optional(),
        scheduledend: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        statecode: z.number().nullable().optional(),
        statuscode: z.number().nullable().optional(),
        prioritycode: z.number().nullable().optional(),
        isalldayevent: z.boolean().nullable().optional(),
        createdon: z.string().nullable().optional(),
        modifiedon: z.string().nullable().optional()
    })
    .passthrough();

const RawListResponseSchema = z.object({
    value: z.array(RawAppointmentSchema),
    '@odata.nextLink': z.string().optional()
});

const AppointmentSchema = z
    .object({
        activityid: z.string().describe('Unique identifier (GUID) of the appointment.'),
        subject: z.string().optional().describe('Subject line of the appointment.'),
        description: z.string().optional().describe('Body text of the appointment.'),
        scheduledstart: z.string().optional().describe('Scheduled start of the appointment as an ISO 8601 UTC timestamp.'),
        scheduledend: z.string().optional().describe('Scheduled end of the appointment as an ISO 8601 UTC timestamp.'),
        location: z.string().optional().describe('Free-text location of the appointment.'),
        statecode: z.number().optional().describe('Status of the appointment: 0 = Open, 1 = Completed, 2 = Canceled, 3 = Scheduled.'),
        statuscode: z.number().optional().describe('Detailed status reason of the appointment (e.g. 3 = Completed, 4 = Canceled).'),
        prioritycode: z.number().optional().describe('Priority of the appointment: 0 = Low, 1 = Normal, 2 = High.'),
        isalldayevent: z.boolean().optional().describe('Whether the appointment is an all-day event.'),
        createdon: z.string().optional().describe('Creation timestamp of the appointment record as an ISO 8601 UTC timestamp.'),
        modifiedon: z.string().optional().describe('Last-modified timestamp of the appointment record as an ISO 8601 UTC timestamp.')
    })
    .passthrough()
    .describe('A Dataverse appointment record. Fields without a value are omitted; extra attributes requested via select are passed through unchanged.');

const OutputSchema = z
    .object({
        appointments: z.array(AppointmentSchema).describe('The page of appointment records matching the query.'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass as cursor to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A page of Dataverse appointments with an optional cursor to the next page.');

/**
 * @tags: [read]
 * @tagReason: Only performs read-only GET requests against the Dataverse Web API; no provider data is created, modified, or deleted.
 * @pitfalls: When cursor is provided, the select, filter, orderby, and top inputs are ignored because the cursor already encodes the original query. Records may include attributes beyond those requested in select. When top is omitted, the provider applies its own page-size limit, so callers must follow next_cursor to retrieve all matches.
 */
const action = createAction({
    description: 'List Dataverse appointment activities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = '/api/data/v9.2/appointments';
        let params: Record<string, string | number>;

        if (input.cursor !== undefined) {
            let cursorUrl: URL;
            // @allowTryCatch: an unparsable cursor must surface as a caller-facing ActionError instead of an uncaught TypeError from the URL constructor.
            try {
                cursorUrl = new URL(input.cursor);
            } catch {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'The cursor input is not a valid URL. Pass the next_cursor value returned by a previous list-appointments call.'
                });
            }
            if (!cursorUrl.pathname.startsWith('/api/data/')) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message:
                        'The cursor input does not point at a Dataverse Web API path. Pass the next_cursor value returned by a previous list-appointments call.'
                });
            }
            endpoint = cursorUrl.pathname;
            params = Object.fromEntries(cursorUrl.searchParams.entries());
        } else {
            const selectedFields = input.select !== undefined && input.select.length > 0 ? input.select.join(',') : DEFAULT_SELECT_FIELDS.join(',');
            params = { $select: selectedFields };
            if (input.filter !== undefined) {
                params['$filter'] = input.filter;
            }
            if (input.orderby !== undefined) {
                params['$orderby'] = input.orderby;
            }
            if (input.top !== undefined) {
                params['$top'] = input.top;
            }
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint,
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = RawListResponseSchema.parse(response.data);

        const appointments = parsed.value.map((record) => {
            const cleaned: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(record)) {
                if (value === null || key.includes('@')) {
                    continue;
                }
                cleaned[key] = value;
            }
            return AppointmentSchema.parse(cleaned);
        });

        return {
            appointments,
            ...(parsed['@odata.nextLink'] !== undefined && { next_cursor: parsed['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
