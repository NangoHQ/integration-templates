import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique ID of the deal to retrieve. Example: "4150868000002782026"')
});

const OwnerSchema = z
    .object({
        name: z.string(),
        id: z.string(),
        email: z.string()
    })
    .optional();

const CampaignSourceSchema = z
    .object({
        name: z.string(),
        id: z.string()
    })
    .nullable()
    .optional();

const AccountNameSchema = z
    .object({
        name: z.string(),
        id: z.string()
    })
    .nullable()
    .optional();

const ContactNameSchema = z
    .object({
        name: z.string(),
        id: z.string()
    })
    .nullable()
    .optional();

const LayoutSchema = z
    .object({
        name: z.string(),
        id: z.string()
    })
    .optional();

const ProviderDealSchema = z.object({
    id: z.string(),
    Deal_Name: z.string(),
    Stage: z.string(),
    Closing_Date: z.string(),
    Amount: z.number().optional(),
    Expected_Revenue: z.number().optional(),
    Probability: z.number().optional(),
    Next_Step: z.string().nullable().optional(),
    Type: z.string().nullable().optional(),
    Lead_Source: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Campaign_Source: CampaignSourceSchema,
    Account_Name: AccountNameSchema,
    Contact_Name: ContactNameSchema,
    Owner: OwnerSchema,
    Layout: LayoutSchema,
    Currency: z.string().optional(),
    Exchange_Rate: z.number().optional(),
    $currency_symbol: z.string().optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional(),
    Last_Activity_Time: z.string().nullable().optional(),
    Tag: z.array(z.unknown()).optional(),
    Territory: z.array(z.string()).optional(),
    $approved: z.boolean().optional(),
    $editable: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    dealName: z.string(),
    stage: z.string(),
    closingDate: z.string(),
    amount: z.number().optional(),
    expectedRevenue: z.number().optional(),
    probability: z.number().optional(),
    nextStep: z.string().optional(),
    type: z.string().optional(),
    leadSource: z.string().optional(),
    description: z.string().optional(),
    campaignSource: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    accountName: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    contactName: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    owner: z
        .object({
            name: z.string(),
            id: z.string(),
            email: z.string()
        })
        .optional(),
    layout: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    currency: z.string().optional(),
    exchangeRate: z.number().optional(),
    currencySymbol: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    lastActivityTime: z.string().optional(),
    tags: z.array(z.unknown()).optional(),
    territory: z.array(z.string()).optional(),
    approved: z.boolean().optional(),
    editable: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single deal from Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-deal',
        group: 'Deals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.Deals.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: `/crm/v2/Deals/${input.id}`,
            retries: 3
        });

        if (!response.data || !response.data.data || response.data.data.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Deal not found',
                dealId: input.id
            });
        }

        const deal = ProviderDealSchema.parse(response.data.data[0]);

        return {
            id: deal.id,
            dealName: deal.Deal_Name,
            stage: deal.Stage,
            closingDate: deal.Closing_Date,
            ...(deal.Amount !== undefined && { amount: deal.Amount }),
            ...(deal.Expected_Revenue !== undefined && { expectedRevenue: deal.Expected_Revenue }),
            ...(deal.Probability !== undefined && { probability: deal.Probability }),
            ...(deal.Next_Step != null && { nextStep: deal.Next_Step }),
            ...(deal.Type != null && { type: deal.Type }),
            ...(deal.Lead_Source != null && { leadSource: deal.Lead_Source }),
            ...(deal.Description != null && { description: deal.Description }),
            ...(deal.Campaign_Source != null && { campaignSource: deal.Campaign_Source }),
            ...(deal.Account_Name != null && { accountName: deal.Account_Name }),
            ...(deal.Contact_Name != null && { contactName: deal.Contact_Name }),
            ...(deal.Owner && { owner: deal.Owner }),
            ...(deal.Layout && { layout: deal.Layout }),
            ...(deal.Currency !== undefined && { currency: deal.Currency }),
            ...(deal.Exchange_Rate !== undefined && { exchangeRate: deal.Exchange_Rate }),
            ...(deal.$currency_symbol !== undefined && { currencySymbol: deal.$currency_symbol }),
            ...(deal.Created_Time !== undefined && { createdTime: deal.Created_Time }),
            ...(deal.Modified_Time !== undefined && { modifiedTime: deal.Modified_Time }),
            ...(deal.Last_Activity_Time != null && { lastActivityTime: deal.Last_Activity_Time }),
            ...(deal.Tag !== undefined && { tags: deal.Tag }),
            ...(deal.Territory !== undefined && { territory: deal.Territory }),
            ...(deal.$approved !== undefined && { approved: deal.$approved }),
            ...(deal.$editable !== undefined && { editable: deal.$editable })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
