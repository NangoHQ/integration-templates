import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Default is 1.'),
    per_page: z.number().optional().describe('Number of records per page. Default is 200, max is 200.'),
    sort_by: z.string().optional().describe('Field to sort by. Default is "id".'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order: asc or desc. Default is desc.')
});

const OwnerSchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string().optional()
});

const AccountSchema = z
    .object({
        name: z.string(),
        id: z.string()
    })
    .nullable();

const ContactSchema = z
    .object({
        name: z.string(),
        id: z.string()
    })
    .nullable();

const CampaignSchema = z
    .object({
        name: z.string(),
        id: z.string()
    })
    .nullable();

const LayoutSchema = z.object({
    name: z.string(),
    id: z.string()
});

const DealSchema = z
    .object({
        id: z.string(),
        Deal_Name: z.string().optional(),
        Amount: z.number().nullable().optional(),
        Stage: z.string().nullable().optional(),
        Probability: z.number().nullable().optional(),
        Closing_Date: z.string().nullable().optional(),
        Owner: OwnerSchema.optional(),
        Account_Name: AccountSchema.nullable().optional(),
        Contact_Name: ContactSchema.nullable().optional(),
        Campaign_Source: CampaignSchema.nullable().optional(),
        Type: z.string().nullable().optional(),
        Lead_Source: z.string().nullable().optional(),
        Description: z.string().nullable().optional(),
        Next_Step: z.string().nullable().optional(),
        Created_Time: z.string().optional(),
        Modified_Time: z.string().optional(),
        Created_By: OwnerSchema.optional(),
        Modified_By: OwnerSchema.optional(),
        Layout: LayoutSchema.optional(),
        Tag: z.array(z.object({ name: z.string(), id: z.string() })).optional()
    })
    .passthrough();

const InfoSchema = z.object({
    per_page: z.number(),
    count: z.number(),
    page: z.number(),
    more_records: z.boolean(),
    sort_by: z.string().optional(),
    sort_order: z.string().optional()
});

const OutputSchema = z.object({
    deals: z.array(DealSchema),
    info: InfoSchema
});

const action = createAction({
    description: 'List deals from Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.sort_by !== undefined) {
            params['sort_by'] = input.sort_by;
        }
        if (input.sort_order !== undefined) {
            params['sort_order'] = input.sort_order;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: '/crm/v2/Deals',
            ...(Object.keys(params).length > 0 && { params }),
            retries: 3
        });

        const responseSchema = z.object({
            data: z.array(z.record(z.string(), z.unknown())),
            info: InfoSchema
        });

        const rawResponse = responseSchema.parse(response.data);

        const deals = rawResponse.data.map((deal: Record<string, unknown>) => DealSchema.parse(deal));

        return {
            deals,
            info: rawResponse.info
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
