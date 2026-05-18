import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    record_id: z.string().describe('The ID of the deal to update. Example: "7328395000000698002"'),
    deal_name: z.string().optional().describe('Name of the deal.'),
    stage: z.string().optional().describe('Sales stage of the deal. Example: "Closed Won"'),
    amount: z.number().optional().describe('Deal amount value.'),
    closing_date: z.string().optional().describe('Expected closing date of the deal. Format: YYYY-MM-DD'),
    account_id: z.string().optional().describe('ID of the account associated with the deal.'),
    contact_id: z.string().optional().describe('ID of the contact associated with the deal.'),
    campaign_id: z.string().optional().describe('ID of the campaign associated with the deal.'),
    lead_source: z.string().optional().describe('Source of the lead.'),
    probability: z.number().optional().describe('Probability of deal closure (percentage).'),
    next_step: z.string().optional().describe('Next step to proceed with the deal.'),
    description: z.string().nullable().optional().describe('Description of the deal. Use null to clear.')
});

const UpdateResultSchema = z.object({
    code: z.string(),
    details: z.object({
        id: z.string(),
        Modified_Time: z.string().optional(),
        Created_Time: z.string().optional(),
        Modified_By: z.object({ name: z.string(), id: z.string() }).optional(),
        Created_By: z.object({ name: z.string(), id: z.string() }).optional()
    }),
    message: z.string(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(UpdateResultSchema)
});

const OutputSchema = z.object({
    success: z.boolean(),
    deal_id: z.string(),
    message: z.string(),
    modified_time: z.string().optional()
});

const action = createAction({
    description: 'Update a deal in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-deal',
        group: 'Deals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.ALL', 'ZohoCRM.modules.deals.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input.deal_name !== undefined) {
            requestBody['Deal_Name'] = input.deal_name;
        }
        if (input.stage !== undefined) {
            requestBody['Stage'] = input.stage;
        }
        if (input.amount !== undefined) {
            requestBody['Amount'] = input.amount;
        }
        if (input.closing_date !== undefined) {
            requestBody['Closing_Date'] = input.closing_date;
        }
        if (input.account_id !== undefined) {
            requestBody['Account_Name'] = { id: input.account_id };
        }
        if (input.contact_id !== undefined) {
            requestBody['Contact_Name'] = { id: input.contact_id };
        }
        if (input.campaign_id !== undefined) {
            requestBody['Campaign_Source'] = { id: input.campaign_id };
        }
        if (input.lead_source !== undefined) {
            requestBody['Lead_Source'] = input.lead_source;
        }
        if (input.probability !== undefined) {
            requestBody['Probability'] = input.probability;
        }
        if (input.next_step !== undefined) {
            requestBody['Next_Step'] = input.next_step;
        }
        if (input.description !== undefined) {
            requestBody['Description'] = input.description;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/update-specific-record.html
        const response = await nango.put({
            endpoint: `/crm/v2/Deals/${input.record_id}`,
            data: {
                data: [requestBody]
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Zoho CRM response',
                zod_error: parsed.error.message
            });
        }

        const result = parsed.data.data[0];
        if (!result) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Deal with ID ${input.record_id} not found or update failed`
            });
        }

        return {
            success: result.status === 'success',
            deal_id: result.details.id,
            message: result.message,
            ...(result.details.Modified_Time !== undefined && { modified_time: result.details.Modified_Time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
