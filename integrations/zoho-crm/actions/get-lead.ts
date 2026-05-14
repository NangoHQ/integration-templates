import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recordId: z.string().describe('The unique ID of the lead record to retrieve. Example: "1306462000000888026"')
});

const UserSchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string().optional()
});

const ApprovalSchema = z.object({
    delegate: z.boolean().optional(),
    approve: z.boolean().optional(),
    reject: z.boolean().optional(),
    resubmit: z.boolean().optional()
});

const ProviderLeadSchema = z.object({
    id: z.string(),
    Full_Name: z.string().nullable().optional(),
    First_Name: z.string().nullable().optional(),
    Last_Name: z.string().nullable().optional(),
    Email: z.string().nullable().optional(),
    Phone: z.string().nullable().optional(),
    Mobile: z.string().nullable().optional(),
    Company: z.string().nullable().optional(),
    Lead_Source: z.string().nullable().optional(),
    Lead_Status: z.string().nullable().optional(),
    Industry: z.string().nullable().optional(),
    Website: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Street: z.string().nullable().optional(),
    City: z.string().nullable().optional(),
    State: z.string().nullable().optional(),
    Country: z.string().nullable().optional(),
    Zip_Code: z.string().nullable().optional(),
    Annual_Revenue: z.number().nullable().optional(),
    No_of_Employees: z.number().nullable().optional(),
    Rating: z.string().nullable().optional(),
    Skype_ID: z.string().nullable().optional(),
    Twitter: z.string().nullable().optional(),
    Designation: z.string().nullable().optional(),
    Salutation: z.string().nullable().optional(),
    Fax: z.string().nullable().optional(),
    Secondary_Email: z.string().nullable().optional(),
    Email_Opt_Out: z.boolean().optional(),
    Lead_Class: z.string().nullable().optional(),
    Referred_By: z.string().nullable().optional(),
    Record_Image: z.string().nullable().optional(),
    Owner: UserSchema.optional(),
    Created_By: UserSchema.optional(),
    Modified_By: UserSchema.optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional(),
    Last_Activity_Time: z.string().nullable().optional(),
    $currency_symbol: z.string().nullable().optional(),
    $converted: z.boolean().optional(),
    $approved: z.boolean().optional(),
    $approval: ApprovalSchema.nullable().optional(),
    $review_process: ApprovalSchema.nullable().optional(),
    $editable: z.boolean().optional(),
    $process_flow: z.boolean().optional(),
    $orchestration: z.boolean().optional(),
    Tag: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    fullName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    company: z.string().optional(),
    leadSource: z.string().optional(),
    leadStatus: z.string().optional(),
    industry: z.string().optional(),
    website: z.string().optional(),
    description: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
    annualRevenue: z.number().optional(),
    noOfEmployees: z.number().optional(),
    rating: z.string().optional(),
    skypeId: z.string().optional(),
    twitter: z.string().optional(),
    designation: z.string().optional(),
    salutation: z.string().optional(),
    fax: z.string().optional(),
    secondaryEmail: z.string().optional(),
    emailOptOut: z.boolean().optional(),
    leadClass: z.string().optional(),
    referredBy: z.string().optional(),
    recordImage: z.string().optional(),
    owner: z.object({ name: z.string(), id: z.string(), email: z.string().optional() }).optional(),
    createdBy: z.object({ name: z.string(), id: z.string(), email: z.string().optional() }).optional(),
    modifiedBy: z.object({ name: z.string(), id: z.string(), email: z.string().optional() }).optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    lastActivityTime: z.string().optional(),
    currencySymbol: z.string().optional(),
    converted: z.boolean().optional(),
    approved: z.boolean().optional(),
    tags: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Retrieve a single lead from Zoho CRM by its record ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-lead',
        group: 'Leads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.leads.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: `/crm/v2/Leads/${input.recordId}`,
            retries: 3
        });

        if (!response.data || !response.data.data || response.data.data.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Lead not found',
                recordId: input.recordId
            });
        }

        const lead = ProviderLeadSchema.parse(response.data.data[0]);

        return {
            id: lead.id,
            ...(lead.Full_Name != null && { fullName: lead.Full_Name }),
            ...(lead.First_Name != null && { firstName: lead.First_Name }),
            ...(lead.Last_Name != null && { lastName: lead.Last_Name }),
            ...(lead.Email != null && { email: lead.Email }),
            ...(lead.Phone != null && { phone: lead.Phone }),
            ...(lead.Mobile != null && { mobile: lead.Mobile }),
            ...(lead.Company != null && { company: lead.Company }),
            ...(lead.Lead_Source != null && { leadSource: lead.Lead_Source }),
            ...(lead.Lead_Status != null && { leadStatus: lead.Lead_Status }),
            ...(lead.Industry != null && { industry: lead.Industry }),
            ...(lead.Website != null && { website: lead.Website }),
            ...(lead.Description != null && { description: lead.Description }),
            ...(lead.Street != null && { street: lead.Street }),
            ...(lead.City != null && { city: lead.City }),
            ...(lead.State != null && { state: lead.State }),
            ...(lead.Country != null && { country: lead.Country }),
            ...(lead.Zip_Code != null && { zipCode: lead.Zip_Code }),
            ...(lead.Annual_Revenue != null && { annualRevenue: lead.Annual_Revenue }),
            ...(lead.No_of_Employees != null && { noOfEmployees: lead.No_of_Employees }),
            ...(lead.Rating != null && { rating: lead.Rating }),
            ...(lead.Skype_ID != null && { skypeId: lead.Skype_ID }),
            ...(lead.Twitter != null && { twitter: lead.Twitter }),
            ...(lead.Designation != null && { designation: lead.Designation }),
            ...(lead.Salutation != null && { salutation: lead.Salutation }),
            ...(lead.Fax != null && { fax: lead.Fax }),
            ...(lead.Secondary_Email != null && { secondaryEmail: lead.Secondary_Email }),
            ...(lead.Email_Opt_Out !== undefined && { emailOptOut: lead.Email_Opt_Out }),
            ...(lead.Lead_Class != null && { leadClass: lead.Lead_Class }),
            ...(lead.Referred_By != null && { referredBy: lead.Referred_By }),
            ...(lead.Record_Image != null && { recordImage: lead.Record_Image }),
            ...(lead.Owner !== undefined && {
                owner: {
                    name: lead.Owner.name,
                    id: lead.Owner.id,
                    ...(lead.Owner.email !== undefined && { email: lead.Owner.email })
                }
            }),
            ...(lead.Created_By !== undefined && {
                createdBy: {
                    name: lead.Created_By.name,
                    id: lead.Created_By.id,
                    ...(lead.Created_By.email !== undefined && { email: lead.Created_By.email })
                }
            }),
            ...(lead.Modified_By !== undefined && {
                modifiedBy: {
                    name: lead.Modified_By.name,
                    id: lead.Modified_By.id,
                    ...(lead.Modified_By.email !== undefined && { email: lead.Modified_By.email })
                }
            }),
            ...(lead.Created_Time !== undefined && { createdTime: lead.Created_Time }),
            ...(lead.Modified_Time !== undefined && { modifiedTime: lead.Modified_Time }),
            ...(lead.Last_Activity_Time != null && { lastActivityTime: lead.Last_Activity_Time }),
            ...(lead.$currency_symbol != null && { currencySymbol: lead.$currency_symbol }),
            ...(lead.$converted !== undefined && { converted: lead.$converted }),
            ...(lead.$approved !== undefined && { approved: lead.$approved }),
            ...(lead.Tag !== undefined && { tags: lead.Tag })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
