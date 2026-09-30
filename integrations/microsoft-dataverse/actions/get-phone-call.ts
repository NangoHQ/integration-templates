import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        activity_id: z.string().describe('Unique identifier (GUID) of the phone call activity to retrieve. Example: "9b0f1c2d-3e4a-4b5c-8d6e-7f8a9b0c1d2e"'),
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Field (attribute) names to return, e.g. ["subject", "phonenumber", "scheduledstart"]. Maps to the OData $select query option. When omitted, all fields of the phone call are returned.'
            )
    })
    .describe('Input for retrieving a single phone call activity by id.');

const OutputSchema = z
    .object({
        activityid: z.string().describe('Unique identifier (GUID) of the phone call activity.'),
        activitytypecode: z.string().optional().describe('Type of the activity. Always "phonecall" for phone call records.'),
        subject: z.string().nullable().optional().describe('Subject of the phone call.'),
        description: z.string().nullable().optional().describe('Body text / notes of the phone call.'),
        phonenumber: z.string().nullable().optional().describe('Phone number the call was placed to or received from.'),
        directioncode: z.boolean().nullable().optional().describe('Direction of the call: true = outgoing, false = incoming.'),
        statecode: z.number().nullable().optional().describe('Status of the phone call: 0 = Open, 1 = Completed, 2 = Canceled, 3 = Scheduled.'),
        statuscode: z
            .number()
            .nullable()
            .optional()
            .describe('Detailed status reason of the phone call; the meaning depends on statecode (e.g. 2 = Made, 4 = Received for completed calls).'),
        prioritycode: z.number().nullable().optional().describe('Priority of the phone call: 0 = Low, 1 = Normal, 2 = High.'),
        scheduledstart: z.string().nullable().optional().describe('Scheduled start time of the call (ISO 8601, UTC).'),
        scheduledend: z.string().nullable().optional().describe('Scheduled end time of the call (ISO 8601, UTC).'),
        actualstart: z.string().nullable().optional().describe('Actual start time of the call (ISO 8601, UTC).'),
        actualend: z.string().nullable().optional().describe('Actual end time of the call (ISO 8601, UTC).'),
        actualdurationminutes: z.number().nullable().optional().describe('Actual duration of the call in minutes.'),
        leftvoicemail: z.boolean().nullable().optional().describe('Whether a voicemail was left on this call.'),
        createdon: z.string().optional().describe('Date and time when the record was created (ISO 8601, UTC).'),
        modifiedon: z.string().optional().describe('Date and time when the record was last modified (ISO 8601, UTC).'),
        _ownerid_value: z.string().nullable().optional().describe('GUID of the user or team that owns the phone call.'),
        _regardingobjectid_value: z
            .string()
            .nullable()
            .optional()
            .describe('GUID of the record (e.g. account, contact, opportunity) the phone call is regarding.'),
        _createdby_value: z.string().nullable().optional().describe('GUID of the user who created the record.'),
        _modifiedby_value: z.string().nullable().optional().describe('GUID of the user who last modified the record.')
    })
    .passthrough()
    .describe(
        'A single phone call activity record. Fields not requested via select are omitted rather than returned as null; additional organization-specific fields are passed through unchanged.'
    );

/**
 * @tags: [read]
 * @tagReason: Performs a read-only GET of a single phone call record from the provider and mutates nothing.
 * @pitfalls: The response passes through OData metadata fields (e.g. @odata.etag) alongside the record's own fields, and when select is provided the record id is still returned even if not requested.
 */
const action = createAction({
    description: 'Retrieve a single phone call activity by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/phonecall
        const response = await nango.get({
            endpoint: `/api/data/v9.2/phonecalls(${encodeURIComponent(input.activity_id)})`,
            params: {
                ...(input.select !== undefined && input.select.length > 0 && { $select: input.select.join(',') })
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
