import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of records per page. Maximum 200.'),
    fields: z.string().optional().describe('Comma-separated list of field API names to retrieve.'),
    sort_by: z.string().optional().describe('Field to sort by.'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order: asc or desc. Default is desc.'),
    converted: z.enum(['true', 'false', 'both']).optional().describe('Filter by converted status.'),
    approved: z.enum(['true', 'false', 'both']).optional().describe('Filter by approved status.')
});

const OwnerSchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string()
});

const LeadSchema = z
    .object({
        id: z.string(),
        Owner: OwnerSchema.optional(),
        Company: z.string().optional(),
        Email: z.string().nullable().optional(),
        First_Name: z.string().nullable().optional(),
        Last_Name: z.string(),
        Full_Name: z.string().optional(),
        Phone: z.string().nullable().optional(),
        Mobile: z.string().nullable().optional(),
        Website: z.string().nullable().optional(),
        Lead_Status: z.string().nullable().optional(),
        Lead_Source: z.string().nullable().optional(),
        Industry: z.string().nullable().optional(),
        Annual_Revenue: z.number().nullable().optional(),
        No_of_Employees: z.number().nullable().optional(),
        Rating: z.string().nullable().optional(),
        Created_Time: z.string().optional(),
        Modified_Time: z.string().optional(),
        Created_By: OwnerSchema.optional(),
        Modified_By: OwnerSchema.optional(),
        Street: z.string().nullable().optional(),
        City: z.string().nullable().optional(),
        State: z.string().nullable().optional(),
        Zip_Code: z.string().nullable().optional(),
        Country: z.string().nullable().optional(),
        Description: z.string().nullable().optional(),
        Skype_ID: z.string().nullable().optional(),
        Twitter: z.string().nullable().optional(),
        Secondary_Email: z.string().nullable().optional(),
        Designation: z.string().nullable().optional(),
        Email_Opt_Out: z.boolean().optional(),
        $converted: z.boolean().optional(),
        $approved: z.boolean().optional(),
        Tag: z.array(z.object({ name: z.string(), id: z.string() })).optional()
    })
    .passthrough();

const InfoSchema = z.object({
    per_page: z.number(),
    count: z.number(),
    page: z.number(),
    more_records: z.boolean(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()).optional(),
    info: z.unknown().optional()
});

const OutputSchema = z.object({
    leads: z.array(LeadSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean(),
    total_count: z.number()
});

const action = createAction({
    description: 'List leads from Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.leads.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid page number (positive integer).'
            });
        }

        const params: Record<string, string | number> = {
            page: page
        };

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.fields !== undefined) {
            params['fields'] = input.fields;
        }
        if (input.sort_by !== undefined) {
            params['sort_by'] = input.sort_by;
        }
        if (input.sort_order !== undefined) {
            params['sort_order'] = input.sort_order;
        }
        if (input.converted !== undefined) {
            params['converted'] = input.converted;
        }
        if (input.approved !== undefined) {
            params['approved'] = input.approved;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: '/crm/v2/Leads',
            params: params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from Zoho CRM API.'
            });
        }

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Invalid response format from Zoho CRM API.'
            });
        }

        const leadsData = parsedResponse.data;

        if (!Array.isArray(leadsData.data)) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Invalid response format from Zoho CRM API.'
            });
        }

        const leads: z.infer<typeof LeadSchema>[] = [];
        for (const item of leadsData.data) {
            const parsed = LeadSchema.safeParse(item);
            if (parsed.success) {
                leads.push(parsed.data);
            }
        }

        const info = InfoSchema.safeParse(leadsData.info);
        const infoData = info.success ? info.data : { per_page: 200, count: leads.length, page: page, more_records: false };

        const nextCursor = infoData.more_records ? String(page + 1) : undefined;

        return {
            leads: leads,
            next_cursor: nextCursor,
            has_more: infoData.more_records,
            total_count: infoData.count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
