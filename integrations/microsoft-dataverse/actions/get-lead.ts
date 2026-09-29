import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        leadid: z.string().describe('The unique identifier (GUID) of the lead to retrieve. Example: "5b8f6a2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b"'),
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Lead attribute (column) names to return, sent as the OData $select query option. Example: ["subject", "lastname", "companyname"]. Omit to return all attributes.'
            )
    })
    .describe('Input for retrieving a single Dataverse lead');

const OutputSchema = z
    .looseObject({
        leadid: z.string().describe('The unique identifier (GUID) of the lead.'),
        subject: z.string().nullable().optional().describe('Topic or subject of the lead.'),
        firstname: z.string().nullable().optional().describe('First name of the lead contact.'),
        lastname: z.string().nullable().optional().describe('Last name of the lead contact.'),
        fullname: z.string().nullable().optional().describe('Full display name of the lead contact.'),
        companyname: z.string().nullable().optional().describe('Name of the company the lead is associated with.'),
        jobtitle: z.string().nullable().optional().describe('Job title of the lead contact.'),
        emailaddress1: z.string().nullable().optional().describe('Primary email address of the lead contact.'),
        telephone1: z.string().nullable().optional().describe('Primary phone number of the lead contact.'),
        mobilephone: z.string().nullable().optional().describe('Mobile phone number of the lead contact.'),
        websiteurl: z.string().nullable().optional().describe('Website URL of the lead or their company.'),
        description: z.string().nullable().optional().describe('Free-text notes describing the lead.'),
        leadqualitycode: z.number().int().nullable().optional().describe('Lead quality option set value: 1 = Hot, 2 = Warm, 3 = Cold.'),
        leadsourcecode: z.number().int().nullable().optional().describe('Lead source option set value, e.g. 1 = Advertisement, 8 = Web.'),
        statecode: z.number().int().nullable().optional().describe('Lifecycle state of the lead: 0 = Open, 1 = Qualified, 2 = Disqualified.'),
        statuscode: z.number().int().nullable().optional().describe('Detailed status option set value of the lead within its state.'),
        createdon: z.string().nullable().optional().describe('ISO 8601 timestamp of when the lead record was created.'),
        modifiedon: z.string().nullable().optional().describe('ISO 8601 timestamp of when the lead record was last modified.'),
        _ownerid_value: z.string().nullable().optional().describe('GUID of the user or team that owns the lead.'),
        _parentaccountid_value: z.string().nullable().optional().describe('GUID of the parent account linked to the lead.'),
        _parentcontactid_value: z.string().nullable().optional().describe('GUID of the parent contact linked to the lead.')
    })
    .describe(
        'A single Dataverse lead record. Attributes with no value are returned as explicit null. Attributes beyond the ones listed, including custom lead fields, depend on the select input and are passed through unchanged.'
    );

// Keep the serialized response safely under Nango's 2 MB action output limit: an arbitrary
// large custom field named in select, or the full record when select is omitted, is otherwise
// unbounded since this direct pass-through preserves every provider attribute unchanged.
const MAX_OUTPUT_BYTES = 1_900_000;

/**
 * @tags: [read]
 * @tagReason: Retrieves a single lead record from Dataverse without modifying any provider data.
 * @pitfalls: Requesting a lead id that does not exist or has been deleted fails with a 404 error rather than returning an empty result, and deletions take effect immediately with no soft-delete grace period. This action rejects a response that would exceed a safe size.
 */
const action = createAction({
    description: 'Retrieve a single lead by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/leads(${encodeURIComponent(input.leadid)})`,
            params: {
                ...(input.select !== undefined && input.select.length > 0 && { $select: input.select.join(',') })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const output = OutputSchema.parse(response.data);

        const outputSize = new TextEncoder().encode(JSON.stringify(output)).length;
        if (outputSize > MAX_OUTPUT_BYTES) {
            throw new nango.ActionError({
                type: 'response_too_large',
                message: `The response (~${Math.round(outputSize / 1024)} KB) is too large to return safely. Narrow select to exclude large fields and try again.`
            });
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
