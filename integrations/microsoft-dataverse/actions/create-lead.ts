import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        lastname: z.string().describe('Last name of the lead contact. Maps to the Dataverse lead attribute `lastname`. Example: "Doe"'),
        companyname: z
            .string()
            .describe('Company or organization the lead is associated with. Maps to the Dataverse lead attribute `companyname`. Example: "Contoso Ltd."'),
        subject: z
            .string()
            .optional()
            .describe(
                'Topic of the lead, shown as its title in Dynamics 365. Maps to the Dataverse lead attribute `subject`. Example: "Interested in 50 coffee makers"'
            ),
        firstname: z.string().optional().describe('First name of the lead contact. Maps to the Dataverse lead attribute `firstname`. Example: "Jane"'),
        jobtitle: z
            .string()
            .optional()
            .describe('Job title of the lead contact. Maps to the Dataverse lead attribute `jobtitle`. Example: "Purchasing Manager"'),
        emailaddress1: z
            .string()
            .optional()
            .describe('Primary email address of the lead contact. Maps to the Dataverse lead attribute `emailaddress1`. Example: "jane.doe@contoso.com"'),
        telephone1: z
            .string()
            .optional()
            .describe('Primary phone number of the lead contact. Maps to the Dataverse lead attribute `telephone1`. Example: "+1-555-0100"'),
        websiteurl: z
            .string()
            .optional()
            .describe('Website URL associated with the lead. Maps to the Dataverse lead attribute `websiteurl`. Example: "https://www.contoso.com"'),
        description: z
            .string()
            .optional()
            .describe(
                'Free-form notes describing the lead. Maps to the Dataverse lead attribute `description`. Example: "Met at trade show, asked for a quote."'
            )
    })
    .describe(
        'Fields for creating a new Dataverse lead. `lastname` and `companyname` are required; all other fields map to the optional lead attribute of the same name.'
    );

const LeadResponseSchema = z.object({
    leadid: z.string(),
    subject: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    companyname: z.string().nullable().optional(),
    jobtitle: z.string().nullable().optional(),
    emailaddress1: z.string().nullable().optional(),
    telephone1: z.string().nullable().optional(),
    websiteurl: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    createdon: z.string().nullable().optional(),
    modifiedon: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier (GUID) of the created lead. Example: "6f2c9e8a-3b1d-4c5e-9a7b-1d2e3f4a5b6c"'),
        subject: z.string().optional().describe('Topic of the lead. Omitted when the lead has no topic set.'),
        firstname: z.string().optional().describe('First name of the lead contact. Omitted when not set.'),
        lastname: z.string().optional().describe('Last name of the lead contact. Omitted when not set.'),
        companyname: z.string().optional().describe('Company or organization the lead is associated with. Omitted when not set.'),
        jobtitle: z.string().optional().describe('Job title of the lead contact. Omitted when not set.'),
        emailaddress1: z.string().optional().describe('Primary email address of the lead contact. Omitted when not set.'),
        telephone1: z.string().optional().describe('Primary phone number of the lead contact. Omitted when not set.'),
        websiteurl: z.string().optional().describe('Website URL associated with the lead. Omitted when not set.'),
        description: z.string().optional().describe('Free-form notes describing the lead. Omitted when not set.'),
        createdon: z.string().optional().describe('ISO 8601 UTC timestamp of when the lead was created. Example: "2026-09-29T12:34:56Z"'),
        modifiedon: z.string().optional().describe('ISO 8601 UTC timestamp of when the lead was last modified. Example: "2026-09-29T12:34:56Z"')
    })
    .describe('The created Dataverse lead, read back from the provider after creation. Optional fields that are not set on the lead are omitted.');

/**
 * @tags: [read, write]
 * @tagReason: Creates a new lead record in Dataverse, then reads the created record back to return it.
 * @pitfalls: Creating a lead performs no duplicate detection, so repeated calls with the same input create multiple distinct lead records rather than returning or updating an existing one.
 */
const action = createAction({
    description: 'Create a lead.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const createConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api
            endpoint: '/api/data/v9.2/leads',
            data: {
                lastname: input.lastname,
                companyname: input.companyname,
                ...(input.subject !== undefined && { subject: input.subject }),
                ...(input.firstname !== undefined && { firstname: input.firstname }),
                ...(input.jobtitle !== undefined && { jobtitle: input.jobtitle }),
                ...(input.emailaddress1 !== undefined && { emailaddress1: input.emailaddress1 }),
                ...(input.telephone1 !== undefined && { telephone1: input.telephone1 }),
                ...(input.websiteurl !== undefined && { websiteurl: input.websiteurl }),
                ...(input.description !== undefined && { description: input.description })
            },
            // Creating a lead is not idempotent: retrying a lost POST response would create a duplicate lead, so retries are disabled.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- the lint rule only accepts integers > 0, but 0 is deliberate here.
            retries: 0
        };
        const createResponse = await nango.post(createConfig);

        const entityIdHeader = createResponse.headers['odata-entityid'];
        const leadIdMatch = typeof entityIdHeader === 'string' ? entityIdHeader.match(/leads\(([0-9a-fA-F-]{36})\)/) : null;
        const leadId = leadIdMatch?.[1];
        if (!leadId) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Lead was created but the response did not include an OData-EntityId header with the new lead id.'
            });
        }

        const getConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/leads(${encodeURIComponent(leadId)})`,
            params: {
                $select: 'leadid,subject,firstname,lastname,companyname,jobtitle,emailaddress1,telephone1,websiteurl,description,createdon,modifiedon'
            },
            retries: 3
        };
        const getResponse = await nango.get(getConfig);

        const lead = LeadResponseSchema.parse(getResponse.data);

        return {
            id: lead.leadid,
            ...(lead.subject != null && { subject: lead.subject }),
            ...(lead.firstname != null && { firstname: lead.firstname }),
            ...(lead.lastname != null && { lastname: lead.lastname }),
            ...(lead.companyname != null && { companyname: lead.companyname }),
            ...(lead.jobtitle != null && { jobtitle: lead.jobtitle }),
            ...(lead.emailaddress1 != null && { emailaddress1: lead.emailaddress1 }),
            ...(lead.telephone1 != null && { telephone1: lead.telephone1 }),
            ...(lead.websiteurl != null && { websiteurl: lead.websiteurl }),
            ...(lead.description != null && { description: lead.description }),
            ...(lead.createdon != null && { createdon: lead.createdon }),
            ...(lead.modifiedon != null && { modifiedon: lead.modifiedon })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
