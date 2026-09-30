import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        contactid: z.string().describe('The unique identifier (GUID) of the contact to retrieve. Example: "cdcfa450-cb0c-ea11-a813-000d3a1b1223"'),
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Optional list of contact attribute names to return (Dataverse $select query option). When omitted, all attributes of the contact are returned. Example: ["fullname", "emailaddress1", "jobtitle"]'
            ),
        expand: z
            .string()
            .optional()
            .describe(
                'Optional Dataverse $expand expression that embeds related records in the response. Example: "parentcustomerid_account($select=name)" to include the account the contact belongs to'
            )
    })
    .describe('Input for retrieving a single contact by id');

const OutputSchema = z
    .object({
        contactid: z.string().describe('The unique identifier (GUID) of the contact'),
        fullname: z.string().nullable().optional().describe('Full name of the contact'),
        firstname: z.string().nullable().optional().describe('First name of the contact'),
        lastname: z.string().nullable().optional().describe('Last name of the contact'),
        emailaddress1: z.string().nullable().optional().describe('Primary email address of the contact'),
        jobtitle: z.string().nullable().optional().describe('Job title of the contact'),
        telephone1: z.string().nullable().optional().describe('Primary business phone number of the contact'),
        mobilephone: z.string().nullable().optional().describe('Mobile phone number of the contact'),
        department: z.string().nullable().optional().describe('Department of the contact within the parent account'),
        description: z.string().nullable().optional().describe('Free-text notes about the contact'),
        _parentcustomerid_value: z.string().nullable().optional().describe('GUID of the parent account (or parent contact) the contact is associated with'),
        _ownerid_value: z.string().nullable().optional().describe('GUID of the user or team that owns the contact'),
        statecode: z.number().nullable().optional().describe('State of the contact: 0 = active, 1 = inactive'),
        statuscode: z.number().nullable().optional().describe('Status reason of the contact: 1 = active, 2 = inactive by default'),
        createdon: z.string().nullable().optional().describe('Date and time when the contact was created, in ISO 8601 format. Example: "2026-09-18T19:43:05Z"'),
        modifiedon: z
            .string()
            .nullable()
            .optional()
            .describe('Date and time when the contact was last modified, in ISO 8601 format. Example: "2026-09-18T19:43:05Z"')
    })
    .passthrough()
    .describe(
        'The retrieved contact. Attributes requested through select or expand that are not listed above are passed through untouched. Attributes that were not requested are absent, while requested attributes without a value are null'
    );

/**
 * @tags: [read]
 * @tagReason: Retrieves a contact through a read-only GET request and never modifies provider data.
 * @pitfalls: Attributes not included in `select` are omitted from the output entirely, while selected attributes without a value are returned as explicit null. Requesting a contact id that does not exist fails with a provider 404 error instead of returning null.
 */
const action = createAction({
    description: 'Retrieve a single contact by id',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.select && input.select.length > 0) {
            params['$select'] = input.select.join(',');
        }
        if (input.expand) {
            params['$expand'] = input.expand;
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/contacts(${encodeURIComponent(input.contactid)})`,
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const { '@odata.context': _odataContext, '@odata.etag': _odataEtag, ...contact } = OutputSchema.parse(response.data);

        return contact;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
