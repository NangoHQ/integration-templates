import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    company: z.string().describe('Company name of the lead. Example: "Zylker"'),
    last_name: z.string().describe('Last name of the lead. Example: "Daly"'),
    first_name: z.string().optional().describe('First name of the lead. Example: "Paul"'),
    email: z.string().optional().describe('Email address of the lead. Example: "p.daly@zylker.com"'),
    phone: z.string().optional().describe('Phone number of the lead.'),
    mobile: z.string().optional().describe('Mobile number of the lead.'),
    fax: z.string().optional().describe('Fax number of the lead.'),
    website: z.string().optional().describe('Website of the lead.'),
    lead_source: z.string().optional().describe('Source of the lead. Example: "Chat", "Employee Referral"'),
    lead_status: z.string().optional().describe('Status of the lead.'),
    industry: z.string().optional().describe('Industry the lead belongs to.'),
    annual_revenue: z.number().optional().describe('Annual revenue of the company.'),
    no_of_employees: z.number().optional().describe('Number of employees in the company.'),
    skype_id: z.string().optional().describe('Skype ID of the lead.'),
    secondary_email: z.string().optional().describe('Secondary email address of the lead.'),
    street: z.string().optional().describe('Street address of the lead.'),
    city: z.string().optional().describe('City of the lead address.'),
    state: z.string().optional().describe('State of the lead address.'),
    zip_code: z.string().optional().describe('Zip code of the lead address.'),
    country: z.string().optional().describe('Country of the lead address.'),
    description: z.string().optional().describe('Additional details about the lead.')
});

const ProviderLeadSchema = z.object({
    id: z.string(),
    Company: z.string().optional(),
    Last_Name: z.string().optional(),
    First_Name: z.string().optional().nullable(),
    Email: z.string().optional().nullable(),
    Phone: z.string().optional().nullable(),
    Mobile: z.string().optional().nullable(),
    Fax: z.string().optional().nullable(),
    Website: z.string().optional().nullable(),
    Lead_Source: z.string().optional().nullable(),
    Lead_Status: z.string().optional().nullable(),
    Industry: z.string().optional().nullable(),
    Annual_Revenue: z.number().optional().nullable(),
    No_of_Employees: z.number().optional().nullable(),
    Skype_ID: z.string().optional().nullable(),
    Secondary_Email: z.string().optional().nullable(),
    Street: z.string().optional().nullable(),
    City: z.string().optional().nullable(),
    State: z.string().optional().nullable(),
    Zip_Code: z.string().optional().nullable(),
    Country: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    Created_Time: z.string().optional().nullable(),
    Modified_Time: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    company: z.string().optional(),
    last_name: z.string().optional(),
    first_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    fax: z.string().optional(),
    website: z.string().optional(),
    lead_source: z.string().optional(),
    lead_status: z.string().optional(),
    industry: z.string().optional(),
    annual_revenue: z.number().optional(),
    no_of_employees: z.number().optional(),
    skype_id: z.string().optional(),
    secondary_email: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip_code: z.string().optional(),
    country: z.string().optional(),
    description: z.string().optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional()
});

const CreateResponseSchema = z.object({
    data: z
        .array(
            z.object({
                code: z.string().optional(),
                details: z.object({ id: z.string().optional() }).optional(),
                message: z.string().optional(),
                status: z.string().optional()
            })
        )
        .optional()
});

const GetLeadResponseSchema = z.object({
    data: z.array(z.record(z.string(), z.unknown())).optional()
});

interface LeadData {
    Company: string;
    Last_Name: string;
    First_Name?: string;
    Email?: string;
    Phone?: string;
    Mobile?: string;
    Fax?: string;
    Website?: string;
    Lead_Source?: string;
    Lead_Status?: string;
    Industry?: string;
    Annual_Revenue?: number;
    No_of_Employees?: number;
    Skype_ID?: string;
    Secondary_Email?: string;
    Street?: string;
    City?: string;
    State?: string;
    Zip_Code?: string;
    Country?: string;
    Description?: string;
}

const action = createAction({
    description: 'Create a lead in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-lead',
        group: 'Leads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const leadData: LeadData = {
            Company: input.company,
            Last_Name: input.last_name
        };

        if (input.first_name !== undefined) {
            leadData['First_Name'] = input.first_name;
        }
        if (input.email !== undefined) {
            leadData['Email'] = input.email;
        }
        if (input.phone !== undefined) {
            leadData['Phone'] = input.phone;
        }
        if (input.mobile !== undefined) {
            leadData['Mobile'] = input.mobile;
        }
        if (input.fax !== undefined) {
            leadData['Fax'] = input.fax;
        }
        if (input.website !== undefined) {
            leadData['Website'] = input.website;
        }
        if (input.lead_source !== undefined) {
            leadData['Lead_Source'] = input.lead_source;
        }
        if (input.lead_status !== undefined) {
            leadData['Lead_Status'] = input.lead_status;
        }
        if (input.industry !== undefined) {
            leadData['Industry'] = input.industry;
        }
        if (input.annual_revenue !== undefined) {
            leadData['Annual_Revenue'] = input.annual_revenue;
        }
        if (input.no_of_employees !== undefined) {
            leadData['No_of_Employees'] = input.no_of_employees;
        }
        if (input.skype_id !== undefined) {
            leadData['Skype_ID'] = input.skype_id;
        }
        if (input.secondary_email !== undefined) {
            leadData['Secondary_Email'] = input.secondary_email;
        }
        if (input.street !== undefined) {
            leadData['Street'] = input.street;
        }
        if (input.city !== undefined) {
            leadData['City'] = input.city;
        }
        if (input.state !== undefined) {
            leadData['State'] = input.state;
        }
        if (input.zip_code !== undefined) {
            leadData['Zip_Code'] = input.zip_code;
        }
        if (input.country !== undefined) {
            leadData['Country'] = input.country;
        }
        if (input.description !== undefined) {
            leadData['Description'] = input.description;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/
        const response = await nango.post({
            endpoint: '/crm/v2/Leads',
            data: {
                data: [leadData]
            },
            retries: 10
        });

        const responseData = CreateResponseSchema.parse(response.data);

        if (!responseData.data || responseData.data.length === 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Invalid response from Zoho CRM API'
            });
        }

        const results = responseData.data;
        const firstResult = results[0];

        if (!firstResult) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No result returned from Zoho CRM API'
            });
        }

        if (firstResult.code !== 'SUCCESS') {
            throw new nango.ActionError({
                type: 'api_error',
                message: firstResult.message || 'Failed to create lead',
                code: firstResult.code,
                status: firstResult.status
            });
        }

        const leadId = firstResult.details?.id;

        if (!leadId) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Lead created but no ID returned'
            });
        }

        // Fetch the created lead to get full details
        // https://www.zoho.com/crm/developer/docs/api/v2/
        const getResponse = await nango.get({
            endpoint: `/crm/v2/Leads/${leadId}`,
            retries: 3
        });

        const getResponseData = GetLeadResponseSchema.parse(getResponse.data);

        if (!getResponseData.data || getResponseData.data.length === 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to retrieve created lead details'
            });
        }

        const firstLead = getResponseData.data[0];
        if (!firstLead) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No lead data returned'
            });
        }

        const providerLead = ProviderLeadSchema.parse(firstLead);

        return {
            id: providerLead.id,
            ...(providerLead.Company !== undefined && { company: providerLead.Company }),
            ...(providerLead.Last_Name !== undefined && { last_name: providerLead.Last_Name }),
            ...(providerLead.First_Name != null && { first_name: providerLead.First_Name }),
            ...(providerLead.Email != null && { email: providerLead.Email }),
            ...(providerLead.Phone != null && { phone: providerLead.Phone }),
            ...(providerLead.Mobile != null && { mobile: providerLead.Mobile }),
            ...(providerLead.Fax != null && { fax: providerLead.Fax }),
            ...(providerLead.Website != null && { website: providerLead.Website }),
            ...(providerLead.Lead_Source != null && { lead_source: providerLead.Lead_Source }),
            ...(providerLead.Lead_Status != null && { lead_status: providerLead.Lead_Status }),
            ...(providerLead.Industry != null && { industry: providerLead.Industry }),
            ...(providerLead.Annual_Revenue != null && { annual_revenue: providerLead.Annual_Revenue }),
            ...(providerLead.No_of_Employees != null && { no_of_employees: providerLead.No_of_Employees }),
            ...(providerLead.Skype_ID != null && { skype_id: providerLead.Skype_ID }),
            ...(providerLead.Secondary_Email != null && { secondary_email: providerLead.Secondary_Email }),
            ...(providerLead.Street != null && { street: providerLead.Street }),
            ...(providerLead.City != null && { city: providerLead.City }),
            ...(providerLead.State != null && { state: providerLead.State }),
            ...(providerLead.Zip_Code != null && { zip_code: providerLead.Zip_Code }),
            ...(providerLead.Country != null && { country: providerLead.Country }),
            ...(providerLead.Description != null && { description: providerLead.Description }),
            ...(providerLead.Created_Time != null && { created_time: providerLead.Created_Time }),
            ...(providerLead.Modified_Time != null && { modified_time: providerLead.Modified_Time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
