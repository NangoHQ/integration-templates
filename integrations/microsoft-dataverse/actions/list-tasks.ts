import { z } from 'zod';
import { createAction } from 'nango';

const DEFAULT_SELECT = [
    'activityid',
    'subject',
    'description',
    'scheduledstart',
    'scheduledend',
    'actualend',
    'statecode',
    'statuscode',
    'prioritycode',
    'createdon',
    'modifiedon'
];

const NEXT_CURSOR_PATTERN = /^https:\/\/[^/]+\/api\/data\/v9\.2\/tasks\?/;

const InputSchema = z
    .object({
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Task attribute logical names to return via OData $select, e.g. ["activityid", "subject", "scheduledstart"]. Defaults to a curated set of common task fields when omitted or empty. Ignored when cursor is set, because the cursor already encodes the original query.'
            ),
        filter: z
            .string()
            .optional()
            .describe(
                'OData $filter expression applied to the tasks collection, e.g. "statecode eq 0" for open tasks or "modifiedon gt 2026-01-01T00:00:00Z". Ignored when cursor is set.'
            ),
        orderby: z.string().optional().describe('OData $orderby expression, e.g. "modifiedon desc". Ignored when cursor is set.'),
        top: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Maximum number of tasks to return in this page via OData $top. Must be a positive integer. Ignored when cursor is set.'),
        cursor: z
            .string()
            .regex(NEXT_CURSOR_PATTERN)
            .optional()
            .describe(
                'Full @odata.nextLink URL copied from a previous response next_cursor field, used to fetch the next page of the original query. Must be an https URL under /api/data/v9.2/tasks. When set, select, filter, orderby, and top are ignored.'
            )
    })
    .describe('Optional OData filters and pagination controls for listing Dataverse tasks.');

const TaskSchema = z
    .object({
        activityid: z.string().optional().describe('Unique identifier (GUID) of the task record.'),
        subject: z.string().nullable().optional().describe('Subject line of the task. Null when the task has no subject.'),
        description: z.string().nullable().optional().describe('Body text of the task. Null when the task has no description.'),
        scheduledstart: z.string().nullable().optional().describe('Scheduled start time of the task as an ISO 8601 UTC timestamp. Null when not set.'),
        scheduledend: z.string().nullable().optional().describe('Scheduled due time of the task as an ISO 8601 UTC timestamp. Null when not set.'),
        actualend: z.string().nullable().optional().describe('Actual completion time of the task as an ISO 8601 UTC timestamp. Null when not set.'),
        statecode: z.number().nullable().optional().describe('State of the task: 0 = Open, 1 = Completed, 2 = Canceled.'),
        statuscode: z
            .number()
            .nullable()
            .optional()
            .describe("Status reason code of the task; the label for each value is defined in the org's task status metadata and depends on statecode."),
        prioritycode: z.number().nullable().optional().describe('Priority of the task: 0 = Low, 1 = Normal, 2 = High.'),
        createdon: z.string().nullable().optional().describe('Timestamp when the task record was created, as an ISO 8601 UTC timestamp.'),
        modifiedon: z.string().nullable().optional().describe('Timestamp when the task record was last modified, as an ISO 8601 UTC timestamp.')
    })
    .passthrough()
    .describe(
        'A Dataverse task activity record. Attributes left empty in Dataverse are returned as null; attributes outside this curated set that were named in select are passed through unchanged.'
    );

const OutputSchema = z
    .object({
        tasks: z.array(TaskSchema).describe('The page of task records returned by Dataverse. Empty when no tasks match the query.'),
        next_cursor: z
            .string()
            .optional()
            .describe(
                'Full @odata.nextLink URL for fetching the next page; present only when more results are available. Pass it back verbatim as the cursor input.'
            )
    })
    .describe('A page of Dataverse task records with an optional cursor to the next page.');

const TasksResponseSchema = z.object({
    value: z.array(TaskSchema),
    '@odata.nextLink': z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Only issues read-only GET requests to the Dataverse Web API to list task records; it never creates, updates, or deletes provider data.
 * @pitfalls: Omitting top can return up to the org's server-side page size (default 5000 records) in one response. Rows can contain attributes beyond those named in select (observed: fields used in orderby) plus a per-row @odata.etag. When cursor is set, select/filter/orderby/top are ignored because the cursor already encodes the original query.
 */
const action = createAction({
    description: 'List Dataverse tasks (activity records), with optional OData select, filter, orderby, and top controls.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = '/api/data/v9.2/tasks';
        const params: Record<string, string | number> = {};

        if (input.cursor) {
            const nextUrl = new URL(input.cursor);
            endpoint = nextUrl.pathname;
            nextUrl.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } else {
            const select = input.select && input.select.length > 0 ? input.select : DEFAULT_SELECT;
            params['$select'] = select.join(',');
            if (input.filter) {
                params['$filter'] = input.filter;
            }
            if (input.orderby) {
                params['$orderby'] = input.orderby;
            }
            if (input.top !== undefined) {
                params['$top'] = input.top;
            }
        }

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/task
        const response = await nango.get({
            endpoint,
            params,
            retries: 3
        });

        const parsed = TasksResponseSchema.parse(response.data);
        const nextLink = parsed['@odata.nextLink'];

        return {
            tasks: parsed.value,
            ...(nextLink !== undefined && { next_cursor: nextLink })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
