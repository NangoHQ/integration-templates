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

const LeadSchema = z.object({
    leadid: z.string().optional(),
    subject: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    fullname: z.string().nullable().optional(),
    companyname: z.string().nullable().optional(),
    jobtitle: z.string().nullable().optional(),
    emailaddress1: z.string().nullable().optional(),
    telephone1: z.string().nullable().optional(),
    mobilephone: z.string().nullable().optional(),
    websiteurl: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    leadqualitycode: z.number().int().nullable().optional(),
    leadsourcecode: z.number().int().nullable().optional(),
    statecode: z.number().int().nullable().optional(),
    statuscode: z.number().int().nullable().optional(),
    createdon: z.string().nullable().optional(),
    modifiedon: z.string().nullable().optional(),
    _ownerid_value: z.string().nullable().optional(),
    _parentaccountid_value: z.string().nullable().optional(),
    _parentcontactid_value: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        leadid: z.string().describe('The unique identifier (GUID) of the lead.'),
        subject: z.string().optional().describe('Topic or subject of the lead.'),
        firstname: z.string().optional().describe('First name of the lead contact.'),
        lastname: z.string().optional().describe('Last name of the lead contact.'),
        fullname: z.string().optional().describe('Full display name of the lead contact.'),
        companyname: z.string().optional().describe('Name of the company the lead is associated with.'),
        jobtitle: z.string().optional().describe('Job title of the lead contact.'),
        emailaddress1: z.string().optional().describe('Primary email address of the lead contact.'),
        telephone1: z.string().optional().describe('Primary phone number of the lead contact.'),
        mobilephone: z.string().optional().describe('Mobile phone number of the lead contact.'),
        websiteurl: z.string().optional().describe('Website URL of the lead or their company.'),
        description: z.string().optional().describe('Free-text notes describing the lead.'),
        leadqualitycode: z.number().int().optional().describe('Lead quality option set value: 1 = Hot, 2 = Warm, 3 = Cold.'),
        leadsourcecode: z.number().int().optional().describe('Lead source option set value, e.g. 1 = Advertisement, 8 = Web.'),
        statecode: z.number().int().optional().describe('Lifecycle state of the lead: 0 = Open, 1 = Qualified, 2 = Disqualified.'),
        statuscode: z.number().int().optional().describe('Detailed status option set value of the lead within its state.'),
        createdon: z.string().optional().describe('ISO 8601 timestamp of when the lead record was created.'),
        modifiedon: z.string().optional().describe('ISO 8601 timestamp of when the lead record was last modified.'),
        _ownerid_value: z.string().optional().describe('GUID of the user or team that owns the lead.'),
        _parentaccountid_value: z.string().optional().describe('GUID of the parent account linked to the lead.'),
        _parentcontactid_value: z.string().optional().describe('GUID of the parent contact linked to the lead.')
    })
    .describe('A single Dataverse lead record. Attributes with no value are omitted from the output.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single lead record from Dataverse without modifying any provider data.
 * @pitfalls: Requesting a lead id that does not exist or has been deleted fails with a 404 error rather than returning an empty result, and deletions take effect immediately with no soft-delete grace period.
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

        const lead = LeadSchema.parse(response.data);

        return {
            leadid: input.leadid,
            ...(lead.subject != null && { subject: lead.subject }),
            ...(lead.firstname != null && { firstname: lead.firstname }),
            ...(lead.lastname != null && { lastname: lead.lastname }),
            ...(lead.fullname != null && { fullname: lead.fullname }),
            ...(lead.companyname != null && { companyname: lead.companyname }),
            ...(lead.jobtitle != null && { jobtitle: lead.jobtitle }),
            ...(lead.emailaddress1 != null && { emailaddress1: lead.emailaddress1 }),
            ...(lead.telephone1 != null && { telephone1: lead.telephone1 }),
            ...(lead.mobilephone != null && { mobilephone: lead.mobilephone }),
            ...(lead.websiteurl != null && { websiteurl: lead.websiteurl }),
            ...(lead.description != null && { description: lead.description }),
            ...(lead.leadqualitycode != null && { leadqualitycode: lead.leadqualitycode }),
            ...(lead.leadsourcecode != null && { leadsourcecode: lead.leadsourcecode }),
            ...(lead.statecode != null && { statecode: lead.statecode }),
            ...(lead.statuscode != null && { statuscode: lead.statuscode }),
            ...(lead.createdon != null && { createdon: lead.createdon }),
            ...(lead.modifiedon != null && { modifiedon: lead.modifiedon }),
            ...(lead._ownerid_value != null && { _ownerid_value: lead._ownerid_value }),
            ...(lead._parentaccountid_value != null && { _parentaccountid_value: lead._parentaccountid_value }),
            ...(lead._parentcontactid_value != null && { _parentcontactid_value: lead._parentcontactid_value })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
