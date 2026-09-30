import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        activity_id: z
            .string()
            .describe('GUID of the email activity to retrieve (the Dataverse `activityid` primary key). Example: "9f1e2c3d-4a5b-6c7d-8e9f-0a1b2c3d4e5f"'),
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Optional Dataverse email field names to return via the OData $select query option, e.g. ["subject", "directioncode", "createdon"]. Omit to return the default field set.'
            )
    })
    .describe('Input for retrieving a single email activity');

const ProviderEmailSchema = z
    .object({
        activityid: z.string().optional(),
        subject: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        directioncode: z.boolean().nullable().optional(),
        statecode: z.number().nullable().optional(),
        statuscode: z.number().nullable().optional(),
        sender: z.string().nullable().optional(),
        torecipients: z.string().nullable().optional(),
        createdon: z.string().nullable().optional(),
        modifiedon: z.string().nullable().optional(),
        _regardingobjectid_value: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        activityid: z.string().optional().describe('GUID of the email activity.'),
        subject: z.string().nullable().optional().describe('Subject line of the email. Null when unset.'),
        description: z.string().nullable().optional().describe('HTML body of the email. Null when unset.'),
        directioncode: z.boolean().nullable().optional().describe('Direction of the email: true for outgoing, false for incoming. Null when unset.'),
        statecode: z.number().nullable().optional().describe('State code of the email (0 = Open, 1 = Completed, 2 = Canceled).'),
        statuscode: z
            .number()
            .nullable()
            .optional()
            .describe('Detailed status reason code of the email; see the Dataverse email statuscode options for meanings.'),
        sender: z.string().nullable().optional().describe('Sender address text stored on the email record. Null when unset.'),
        torecipients: z.string().nullable().optional().describe('Recipient address text stored on the email record. Null when unset.'),
        createdon: z.string().nullable().optional().describe('ISO 8601 timestamp when the email record was created.'),
        modifiedon: z.string().nullable().optional().describe('ISO 8601 timestamp when the email record was last modified.'),
        _regardingobjectid_value: z
            .string()
            .nullable()
            .optional()
            .describe('GUID of the record this email is regarding (e.g. an account or contact), when linked.')
    })
    .passthrough()
    .describe('A single Dataverse email activity record. Additional fields requested via `select` are passed through as-is.');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of an email activity record and mutates nothing on the provider.
 * @pitfalls: Sender/recipient identities live in separate activity-party records, so the response carries only the free-text `sender`/`torecipients` summaries; resolved from/to/cc/bcc addresses require a separate activity-party query.
 */
const action = createAction({
    description: 'Retrieve a single email activity by id',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.select && input.select.length > 0) {
            params['$select'] = input.select.join(',');
        }

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
        const response = await nango.get({
            endpoint: `/api/data/v9.2/emails(${encodeURIComponent(input.activity_id)})`,
            params,
            retries: 3
        });

        return ProviderEmailSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
