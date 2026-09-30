import { z } from 'zod';
import { createAction } from 'nango';

const ActivityPartySchema = z.object({
    addressused: z
        .string()
        .describe('Email address of this party. Unresolved addresses (not matching a Dataverse record) are accepted as-is. Example: "ada@example.com"'),
    participationtypemask: z
        .number()
        .int()
        .min(1)
        .max(11)
        .describe('Role of this party on the email activity: 1 = Sender (From), 2 = To recipient, 3 = CC recipient, 4 = BCC recipient. Example: 2')
});

const InputSchema = z
    .object({
        subject: z.string().optional().describe('Subject line of the email. Omitted or empty values are accepted by Dataverse. Example: "Welcome to Fabrikam"'),
        description: z.string().optional().describe('Body of the email. HTML markup is allowed. Example: "<p>Hello Ada, ...</p>"'),
        activityparties: z
            .array(ActivityPartySchema)
            .optional()
            .describe(
                'Sender and recipients of the email, deep-inserted as activityparty rows with the email. Include one entry with participationtypemask 1 (From) and at least one with mask 2 (To) for a sendable email.'
            )
    })
    .describe('Fields of the Dataverse email activity record to create.');

const ProviderEmailSchema = z.object({
    activityid: z.string(),
    subject: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    statecode: z.number().nullable().optional(),
    createdon: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        activityid: z.string().describe('Unique identifier (GUID) of the created email activity record. Example: "5f7a2b1c-3d4e-4f50-9a8b-1c2d3e4f5a6b"'),
        subject: z.string().optional().describe('Subject line of the created email.'),
        description: z.string().optional().describe('Body of the created email.'),
        statecode: z
            .number()
            .optional()
            .describe('State of the email: 0 = Open (draft), 1 = Completed, 2 = Canceled, 3 = Scheduled. A newly created email is 0.'),
        createdon: z.string().optional().describe('ISO 8601 timestamp of when the record was created. Example: "2026-09-29T12:34:56Z"')
    })
    .describe('The created Dataverse email activity record.');

/**
 * @tags: [read, write]
 * @tagReason: Creates the email activity record (write) and reads the created record back (read) because Dataverse create responses carry no body.
 * @pitfalls: Creating an email only stores a draft activity record; nothing is sent to recipients (sending requires the separate SendEmail bound action). Creation succeeds with no activityparties, but a usable email normally needs at least a From (participationtypemask 1) and a To (mask 2) entry, and Dataverse automatically adds the record owner as an extra party (mask 9).
 */
const action = createAction({
    description: 'Create an email activity record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            ...(input.subject !== undefined && { subject: input.subject }),
            ...(input.description !== undefined && { description: input.description }),
            // Parties are deep-inserted through the email_activity_parties navigation property (the activityparties entity set name itself is rejected in the create payload).
            ...(input.activityparties !== undefined && { email_activity_parties: input.activityparties })
        };

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api
        const createResponse = await nango.post({
            endpoint: '/api/data/v9.2/emails',
            data,
            // No retries: create is not idempotent, so retrying after a lost response could silently create a duplicate email record.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        // Dataverse create returns 204 No Content; the new record URL is carried in the OData-EntityId response header.
        const entityIdHeader = z.string().safeParse(createResponse.headers['odata-entityid'] ?? createResponse.headers['OData-EntityId']);
        if (!entityIdHeader.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Dataverse did not return an OData-EntityId header for the created email record.'
            });
        }

        const idMatch = /\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/.exec(entityIdHeader.data);
        const activityId = idMatch?.[1];
        if (!activityId) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Could not parse the created email record id from the OData-EntityId header.'
            });
        }

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
        const getResponse = await nango.get({
            endpoint: `/api/data/v9.2/emails(${encodeURIComponent(activityId)})`,
            params: {
                $select: 'activityid,subject,description,statecode,createdon'
            },
            retries: 3
        });

        const email = ProviderEmailSchema.parse(getResponse.data);

        return {
            activityid: email.activityid,
            ...(email.subject != null && { subject: email.subject }),
            ...(email.description != null && { description: email.description }),
            ...(email.statecode != null && { statecode: email.statecode }),
            ...(email.createdon != null && { createdon: email.createdon })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
