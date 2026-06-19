import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dealName: z.string().describe('Name of the deal. Example: "Enterprise Software License 2024"'),
    stage: z.string().optional().describe('Current stage of the deal. Example: "Qualification", "Negotiation", "Closed Won"'),
    amount: z.number().optional().describe('Monetary value of the deal. Example: 50000'),
    closingDate: z.string().optional().describe('Expected close date in YYYY-MM-DD format. Example: "2024-12-31"'),
    description: z.string().optional().describe('Description or notes about the deal'),
    accountId: z.string().optional().describe('ID of the associated account. Example: "4150868000000225013"'),
    contactId: z.string().optional().describe('ID of the associated contact. Example: "4150868000000225014"'),
    campaignId: z.string().optional().describe('ID of the source campaign. Example: "4150868000000584006"'),
    ownerId: z.string().optional().describe('ID of the deal owner. Example: "4150868000000225013"'),
    probability: z.number().optional().describe('Probability of closing the deal (0-100). Example: 75'),
    type: z.string().optional().describe('Type of deal. Example: "New Business", "Existing Business"'),
    leadSource: z.string().optional().describe('Source of the lead. Example: "Web", "Referral", "Advertisement"')
});

const ProviderResponseItemSchema = z.object({
    code: z.string(),
    details: z.record(z.string(), z.unknown()),
    message: z.string(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderResponseItemSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    dealName: z.string(),
    stage: z.string().optional(),
    amount: z.number().optional(),
    closingDate: z.string().optional(),
    description: z.string().optional(),
    accountId: z.string().optional(),
    accountName: z.string().optional(),
    contactId: z.string().optional(),
    contactName: z.string().optional(),
    campaignId: z.string().optional(),
    campaignName: z.string().optional(),
    ownerId: z.string().optional(),
    ownerName: z.string().optional(),
    ownerEmail: z.string().optional(),
    probability: z.number().optional(),
    type: z.string().optional(),
    leadSource: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional()
});

const action = createAction({
    description: 'Create a deal in Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const dealData: Record<string, unknown> = {
            Deal_Name: input.dealName
        };

        if (input.stage !== undefined) {
            dealData['Stage'] = input.stage;
        }
        if (input.amount !== undefined) {
            dealData['Amount'] = input.amount;
        }
        if (input.closingDate !== undefined) {
            dealData['Closing_Date'] = input.closingDate;
        }
        if (input.description !== undefined) {
            dealData['Description'] = input.description;
        }
        if (input.accountId !== undefined) {
            dealData['Account_Name'] = { id: input.accountId };
        }
        if (input.contactId !== undefined) {
            dealData['Contact_Name'] = { id: input.contactId };
        }
        if (input.campaignId !== undefined) {
            dealData['Campaign_Source'] = { id: input.campaignId };
        }
        if (input.ownerId !== undefined) {
            dealData['Owner'] = { id: input.ownerId };
        }
        if (input.probability !== undefined) {
            dealData['Probability'] = input.probability;
        }
        if (input.type !== undefined) {
            dealData['Type'] = input.type;
        }
        if (input.leadSource !== undefined) {
            dealData['Lead_Source'] = input.leadSource;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/
        const response = await nango.post({
            endpoint: '/crm/v2/Deals',
            data: {
                data: [dealData]
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Zoho CRM response',
                details: parsed.error.message
            });
        }

        const result = parsed.data.data[0];
        if (result === undefined) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Zoho CRM returned an empty response'
            });
        }

        if (result.status !== 'success') {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: result.message,
                code: result.code
            });
        }

        const deal = result.details;

        // Parse the deal ID from the response
        const id = typeof deal['id'] === 'string' ? deal['id'] : '';
        const dealName = typeof deal['Deal_Name'] === 'string' ? deal['Deal_Name'] : input.dealName;

        // Extract optional fields with type guards
        const stage = typeof deal['Stage'] === 'string' ? deal['Stage'] : undefined;
        const amount = typeof deal['Amount'] === 'number' ? deal['Amount'] : undefined;
        const closingDate = typeof deal['Closing_Date'] === 'string' ? deal['Closing_Date'] : undefined;
        const description = typeof deal['Description'] === 'string' ? deal['Description'] : undefined;
        const type = typeof deal['Type'] === 'string' ? deal['Type'] : undefined;
        const leadSource = typeof deal['Lead_Source'] === 'string' ? deal['Lead_Source'] : undefined;
        const probability = typeof deal['Probability'] === 'number' ? deal['Probability'] : undefined;
        const createdTime = typeof deal['Created_Time'] === 'string' ? deal['Created_Time'] : undefined;
        const modifiedTime = typeof deal['Modified_Time'] === 'string' ? deal['Modified_Time'] : undefined;

        // Extract related objects
        let accountId: string | undefined;
        let accountName: string | undefined;
        const accountNameObj = deal['Account_Name'];
        if (accountNameObj !== null && typeof accountNameObj === 'object' && 'id' in accountNameObj && 'name' in accountNameObj) {
            const idVal = accountNameObj['id'];
            const nameVal = accountNameObj['name'];
            if (typeof idVal === 'string') accountId = idVal;
            if (typeof nameVal === 'string') accountName = nameVal;
        }

        let contactId: string | undefined;
        let contactName: string | undefined;
        const contactNameObj = deal['Contact_Name'];
        if (contactNameObj !== null && typeof contactNameObj === 'object' && 'id' in contactNameObj && 'name' in contactNameObj) {
            const idVal = contactNameObj['id'];
            const nameVal = contactNameObj['name'];
            if (typeof idVal === 'string') contactId = idVal;
            if (typeof nameVal === 'string') contactName = nameVal;
        }

        let campaignId: string | undefined;
        let campaignName: string | undefined;
        const campaignSourceObj = deal['Campaign_Source'];
        if (campaignSourceObj !== null && typeof campaignSourceObj === 'object' && 'id' in campaignSourceObj && 'name' in campaignSourceObj) {
            const idVal = campaignSourceObj['id'];
            const nameVal = campaignSourceObj['name'];
            if (typeof idVal === 'string') campaignId = idVal;
            if (typeof nameVal === 'string') campaignName = nameVal;
        }

        let ownerId: string | undefined;
        let ownerName: string | undefined;
        let ownerEmail: string | undefined;
        const ownerObj = deal['Owner'];
        if (ownerObj !== null && typeof ownerObj === 'object' && 'id' in ownerObj && 'name' in ownerObj) {
            const idVal = ownerObj['id'];
            const nameVal = ownerObj['name'];
            if (typeof idVal === 'string') ownerId = idVal;
            if (typeof nameVal === 'string') ownerName = nameVal;
            if ('email' in ownerObj) {
                const emailVal = ownerObj['email'];
                if (typeof emailVal === 'string') ownerEmail = emailVal;
            }
        }

        return {
            id,
            dealName,
            ...(stage !== undefined && { stage }),
            ...(amount !== undefined && { amount }),
            ...(closingDate !== undefined && { closingDate }),
            ...(description !== undefined && { description }),
            ...(accountId !== undefined && { accountId }),
            ...(accountName !== undefined && { accountName }),
            ...(contactId !== undefined && { contactId }),
            ...(contactName !== undefined && { contactName }),
            ...(campaignId !== undefined && { campaignId }),
            ...(campaignName !== undefined && { campaignName }),
            ...(ownerId !== undefined && { ownerId }),
            ...(ownerName !== undefined && { ownerName }),
            ...(ownerEmail !== undefined && { ownerEmail }),
            ...(probability !== undefined && { probability }),
            ...(type !== undefined && { type }),
            ...(leadSource !== undefined && { leadSource }),
            ...(createdTime !== undefined && { createdTime }),
            ...(modifiedTime !== undefined && { modifiedTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
