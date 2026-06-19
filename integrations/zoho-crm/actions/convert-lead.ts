import { z } from 'zod';
import { createAction } from 'nango';

const DealsInputSchema = z.object({
    Deal_Name: z.string().describe('Name of the deal. Example: "New Business Opportunity"'),
    Closing_Date: z.string().describe('Closing date of the deal in YYYY-MM-DD format. Example: "2024-12-31"'),
    Stage: z.string().describe('Stage of the deal. Example: "Closed Won"'),
    Amount: z.number().optional().describe('Amount of the deal. Example: 1000.50'),
    Pipeline: z.string().optional().describe('Pipeline name. Example: "Standard"'),
    Contact_Role: z.string().optional().describe('Contact role ID. Example: "5545974000000006873"')
});

const CarryOverTagsSchema = z.object({
    Contacts: z.array(z.string()).optional().describe('Tags to carry over to Contacts'),
    Accounts: z.array(z.string()).optional().describe('Tags to carry over to Accounts'),
    Deals: z.array(z.string()).optional().describe('Tags to carry over to Deals')
});

const InputSchema = z.object({
    lead_id: z.string().describe('The unique ID of the lead to convert. Example: "1000000145990"'),
    overwrite: z.boolean().optional().describe('Overwrite lead details in Contact/Account/Deal based on lead conversion mapping. Default: false'),
    notify_lead_owner: z.boolean().optional().describe('Notify the lead owner about conversion via email. Default: false'),
    notify_new_entity_owner: z
        .boolean()
        .optional()
        .describe('Notify the user to whom the contact/account is assigned about conversion via email. Default: false'),
    Accounts: z.string().optional().describe('Existing account ID to associate with the converted lead. Example: "4150868000003283003"'),
    Contacts: z.string().optional().describe('Existing contact ID to associate with the converted lead. Example: "4150868000003283024"'),
    Contact_Role: z.string().optional().describe('Contact role ID to assign to the associated contact. Example: "5545974000000006873"'),
    assign_to: z.string().optional().describe('User ID to assign as the owner for the new contact and account. Example: "4150868000001248015"'),
    Deals: DealsInputSchema.optional().describe('Deal details to create for the newly created account'),
    carry_over_tags: CarryOverTagsSchema.optional().describe('Tags to carry over from lead to contact, account, and deal')
});

const ProviderResponseSchema = z.object({
    data: z.array(
        z.object({
            Contacts: z.string().optional().describe('ID of the created/associated contact'),
            Deals: z.string().optional().describe('ID of the created deal'),
            Accounts: z.string().optional().describe('ID of the created/associated account')
        })
    )
});

const OutputSchema = z.object({
    contact_id: z.string().optional().describe('ID of the created/associated contact'),
    deal_id: z.string().optional().describe('ID of the created deal'),
    account_id: z.string().optional().describe('ID of the created/associated account')
});

const action = createAction({
    description: 'Convert a lead into account, contact, and deal records',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.leads.CREATE', 'ZohoCRM.modules.accounts.CREATE', 'ZohoCRM.modules.contacts.CREATE', 'ZohoCRM.modules.deals.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input.overwrite !== undefined) {
            requestBody['overwrite'] = input.overwrite;
        }
        if (input.notify_lead_owner !== undefined) {
            requestBody['notify_lead_owner'] = input.notify_lead_owner;
        }
        if (input.notify_new_entity_owner !== undefined) {
            requestBody['notify_new_entity_owner'] = input.notify_new_entity_owner;
        }
        if (input.Accounts !== undefined) {
            requestBody['Accounts'] = input.Accounts;
        }
        if (input.Contacts !== undefined) {
            requestBody['Contacts'] = input.Contacts;
        }
        if (input.Contact_Role !== undefined) {
            requestBody['Contact_Role'] = input.Contact_Role;
        }
        if (input.assign_to !== undefined) {
            requestBody['assign_to'] = input.assign_to;
        }
        if (input.Deals !== undefined) {
            requestBody['Deals'] = input.Deals;
        }
        if (input.carry_over_tags !== undefined) {
            requestBody['carry_over_tags'] = input.carry_over_tags;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/convert-lead.html
        const response = await nango.post({
            endpoint: `/crm/v2/Leads/${input.lead_id}/actions/convert`,
            data: {
                data: [requestBody]
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from Zoho CRM API'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        const firstResult = parsed.data[0];

        if (!firstResult) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Empty data array returned from Zoho CRM API'
            });
        }

        return {
            ...(firstResult.Contacts !== undefined && { contact_id: firstResult.Contacts }),
            ...(firstResult.Deals !== undefined && { deal_id: firstResult.Deals }),
            ...(firstResult.Accounts !== undefined && { account_id: firstResult.Accounts })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
