import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const LEAD_SELECT_FIELDS = [
    'leadid',
    'fullname',
    'firstname',
    'lastname',
    'subject',
    'companyname',
    'jobtitle',
    'emailaddress1',
    'telephone1',
    'leadqualitycode',
    'leadsourcecode',
    'statecode',
    'statuscode',
    'createdon',
    'modifiedon'
].join(',');

const InputSchema = z
    .object({
        filter: z
            .string()
            .optional()
            .describe('OData $filter expression applied to the leads entity set, without the "$filter=" prefix. Example: "leadqualitycode eq 1"'),
        orderby: z
            .string()
            .optional()
            .describe('OData $orderby expression applied to the leads entity set, without the "$orderby=" prefix. Example: "createdon desc"'),
        top: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Maximum number of leads to return in this call. Omit to return up to the Dataverse server page size (5000 leads). Example: 50'),
        cursor: z.string().optional().describe("Opaque pagination cursor from a previous response's next_cursor. Omit for the first page.")
    })
    .describe('Optional OData filter, sort and paging options for the leads query. All fields are optional.');

const ProviderLeadSchema = z.object({
    leadid: z.string(),
    fullname: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    subject: z.string().nullable().optional(),
    companyname: z.string().nullable().optional(),
    jobtitle: z.string().nullable().optional(),
    emailaddress1: z.string().nullable().optional(),
    telephone1: z.string().nullable().optional(),
    leadqualitycode: z.number().int().nullable().optional(),
    leadsourcecode: z.number().int().nullable().optional(),
    statecode: z.number().int().nullable().optional(),
    statuscode: z.number().int().nullable().optional(),
    createdon: z.string().nullable().optional(),
    modifiedon: z.string().nullable().optional()
});

const ProviderLeadListSchema = z.object({
    value: z.array(ProviderLeadSchema),
    '@odata.nextLink': z.string().optional()
});

const LeadSchema = z
    .object({
        leadid: z.string().describe('Unique identifier (GUID) of the lead record.'),
        fullname: z.string().optional().describe('Computed full name of the lead contact.'),
        firstname: z.string().optional().describe('First name of the lead contact.'),
        lastname: z.string().optional().describe('Last name of the lead contact.'),
        subject: z.string().optional().describe('Topic describing the lead (the Dataverse "Topic" field).'),
        companyname: z.string().optional().describe('Company or account name associated with the lead.'),
        jobtitle: z.string().optional().describe('Job title of the lead contact.'),
        emailaddress1: z.string().optional().describe('Primary email address of the lead contact.'),
        telephone1: z.string().optional().describe('Primary phone number of the lead contact.'),
        leadqualitycode: z.number().int().optional().describe('Lead rating option-set value: 1 = Hot, 2 = Warm, 3 = Cold.'),
        leadsourcecode: z.number().int().optional().describe('Lead source option-set value (e.g. 1 = Advertisement, 8 = Web); labels are org-configurable.'),
        statecode: z.number().int().optional().describe('Lead state option-set value: 0 = Open, 1 = Qualified, 2 = Disqualified.'),
        statuscode: z
            .number()
            .int()
            .optional()
            .describe('Lead status reason option-set value; valid values depend on the state (e.g. 1 = New, 2 = Contacted while open).'),
        createdon: z.string().optional().describe('ISO 8601 UTC timestamp of when the lead was created. Example: "2026-09-29T12:34:56Z"'),
        modifiedon: z.string().optional().describe('ISO 8601 UTC timestamp of when the lead was last modified. Example: "2026-09-29T12:34:56Z"')
    })
    .describe('A Dataverse lead (unqualified prospect). Fields with no value on the record are omitted.');

const OutputSchema = z
    .object({
        leads: z.array(LeadSchema).describe('The leads matching the query.'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass as the cursor input to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A page of leads plus the cursor for the next page, if any.');

const extractNextCursor = (nextLink: string | undefined): string | undefined => {
    if (!nextLink || !URL.canParse(nextLink)) {
        return undefined;
    }
    return new URL(nextLink).searchParams.get('$skiptoken') ?? undefined;
};

/**
 * @tags: [read]
 * @tagReason: Runs a read-only OData GET query against the Dataverse leads entity set and never mutates provider data.
 * @pitfalls: top is a hard cap rather than a page size - when top is set, results are truncated with no next_cursor to continue from. next_cursor only appears when the result set exceeds Dataverse's server page size (default 5000 records).
 */
const action = createAction({
    description: 'List leads (unqualified prospects) from Microsoft Dataverse.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint: '/api/data/v9.2/leads',
            params: {
                $select: LEAD_SELECT_FIELDS,
                ...(input.filter !== undefined && { $filter: input.filter }),
                ...(input.orderby !== undefined && { $orderby: input.orderby }),
                ...(input.top !== undefined && { $top: input.top }),
                ...(input.cursor !== undefined && { $skiptoken: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderLeadListSchema.parse(response.data);

        const leads = parsed.value.map((lead) => ({
            leadid: lead.leadid,
            ...(lead.fullname != null && { fullname: lead.fullname }),
            ...(lead.firstname != null && { firstname: lead.firstname }),
            ...(lead.lastname != null && { lastname: lead.lastname }),
            ...(lead.subject != null && { subject: lead.subject }),
            ...(lead.companyname != null && { companyname: lead.companyname }),
            ...(lead.jobtitle != null && { jobtitle: lead.jobtitle }),
            ...(lead.emailaddress1 != null && { emailaddress1: lead.emailaddress1 }),
            ...(lead.telephone1 != null && { telephone1: lead.telephone1 }),
            ...(lead.leadqualitycode != null && { leadqualitycode: lead.leadqualitycode }),
            ...(lead.leadsourcecode != null && { leadsourcecode: lead.leadsourcecode }),
            ...(lead.statecode != null && { statecode: lead.statecode }),
            ...(lead.statuscode != null && { statuscode: lead.statuscode }),
            ...(lead.createdon != null && { createdon: lead.createdon }),
            ...(lead.modifiedon != null && { modifiedon: lead.modifiedon })
        }));

        const next_cursor = extractNextCursor(parsed['@odata.nextLink']);

        return {
            leads,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
