import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('Unique identifier (activityid GUID) of the task to retrieve. Example: "f6f57339-4687-eb11-a812-000d3a09c1c0"'),
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Optional list of task attribute names to return, passed as the Dataverse $select query option. Omit to return all attributes. Example: ["subject", "scheduledstart", "scheduledend"]'
            )
    })
    .describe('Input for retrieving a single Dataverse task');

const OutputSchema = z
    .looseObject({
        activityid: z.string().describe('Unique identifier of the task. Always returned, even when select is used.'),
        '@odata.etag': z.string().optional().describe('Concurrency token for the record, usable as an If-Match value on updates.'),
        subject: z.string().nullable().optional().describe('Short subject line of the task.'),
        description: z.string().nullable().optional().describe('Full body text of the task.'),
        scheduledstart: z
            .string()
            .nullable()
            .optional()
            .describe('Planned start time of the task as an ISO 8601 UTC timestamp. Example: "2026-09-19T09:00:00Z"'),
        scheduledend: z.string().nullable().optional().describe('Planned end time of the task as an ISO 8601 UTC timestamp. Example: "2026-09-19T09:30:00Z"'),
        actualstart: z.string().nullable().optional().describe('Actual start time of the task as an ISO 8601 UTC timestamp, or null if not started.'),
        actualend: z.string().nullable().optional().describe('Actual completion time of the task as an ISO 8601 UTC timestamp, or null if not completed.'),
        actualdurationminutes: z.number().nullable().optional().describe('Actual time spent on the task, in minutes.'),
        scheduleddurationminutes: z.number().nullable().optional().describe('Planned duration of the task, in minutes.'),
        percentcomplete: z.number().nullable().optional().describe('Completion percentage of the task, from 0 to 100.'),
        prioritycode: z.number().nullable().optional().describe('Priority of the task: 0 = Low, 1 = Normal, 2 = High.'),
        statecode: z.number().nullable().optional().describe('State of the task: 0 = Open, 1 = Completed, 2 = Canceled.'),
        statuscode: z
            .number()
            .nullable()
            .optional()
            .describe('Detailed status of the task: 2 = Not Started, 3 = In Progress, 4 = Waiting on someone else, 5 = Completed, 6 = Canceled, 7 = Deferred.'),
        category: z.string().nullable().optional().describe('Category of the task.'),
        subcategory: z.string().nullable().optional().describe('Subcategory of the task.'),
        isregularactivity: z.boolean().nullable().optional().describe('Whether the task is a regular activity rather than a recurring or campaign activity.'),
        isbilled: z.boolean().nullable().optional().describe('Whether the task was billed as part of a service activity.'),
        createdon: z.string().optional().describe('Creation time of the record as an ISO 8601 UTC timestamp. Example: "2026-09-18T19:46:57Z"'),
        modifiedon: z.string().optional().describe('Last modification time of the record as an ISO 8601 UTC timestamp. Example: "2026-09-18T19:46:57Z"'),
        versionnumber: z.number().nullable().optional().describe('Row version number of the record, incremented on every update.'),
        _ownerid_value: z
            .string()
            .nullable()
            .optional()
            .describe('GUID of the owning user or team. Lookup fields are returned as raw GUIDs under the _<lookup>_value attribute name.'),
        _regardingobjectid_value: z
            .string()
            .nullable()
            .optional()
            .describe('GUID of the record the task is regarding, such as an account, contact, or opportunity.'),
        _createdby_value: z.string().nullable().optional().describe('GUID of the user who created the record.'),
        _modifiedby_value: z.string().nullable().optional().describe('GUID of the user who last modified the record.')
    })
    .describe(
        'The Dataverse task record. Attributes with no value are returned as explicit null. When the select input is used, only the requested attributes are returned alongside activityid and @odata.etag. Any additional standard or custom attributes are passed through unchanged.'
    );

/**
 * @tags: [read]
 * @tagReason: Retrieves a single task record without modifying any provider data.
 * @pitfalls: Attributes with no value are returned as explicit null rather than being omitted. When select is provided, only the requested attributes are returned, plus activityid and @odata.etag. Lookup and owner fields are returned as raw GUIDs under _<lookup>_value attribute names, not as expanded related records.
 */
const action = createAction({
    description: 'Retrieve a single Dataverse task by its id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_impersonation'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
        const response = await nango.get({
            endpoint: `/api/data/v9.2/tasks(${encodeURIComponent(input.id)})`,
            params: {
                ...(input.select && input.select.length > 0 ? { $select: input.select.join(',') } : {})
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
