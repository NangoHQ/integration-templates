import { z } from 'zod';
import { createAction } from 'nango';

const DealFieldSchema = z.object({
    customFieldId: z.number().int().describe('Field ID, ID of the Custom Field Meta Data. Example: 1'),
    fieldValue: z.string().describe('Updated field value. Example: "First field value"'),
    fieldCurrency: z.string().optional().describe('Required only for the currency field type. Example: "EUR"')
});

const InputSchema = z.object({
    title: z.string().describe('Deal title. Example: "AC Deal"'),
    description: z.string().optional().describe('Deal description. Example: "This deal is an important deal"'),
    account: z.string().optional().describe('Deal account id. Example: "45"'),
    contact: z.string().describe('Deal primary contact id. Example: "1"'),
    value: z.number().int().describe('Deal value in cents. Example: 45600'),
    currency: z.string().describe('Deal currency in 3-digit ISO format, lowercased. Example: "usd"'),
    group: z.string().describe('Deal pipeline id. Example: "1"'),
    stage: z.string().describe('Deal stage id. Example: "1"'),
    owner: z.string().describe('Deal owner id. Example: "1"'),
    percent: z.number().int().optional().nullable().describe('Deal percentage. Example: 25'),
    status: z.number().int().optional().describe('Deal status. Example: 0'),
    fields: z.array(DealFieldSchema).optional().describe('Deal custom field values')
});

const ProviderDealSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    currency: z.string(),
    percent: z.coerce.number().int().nullable().optional(),
    status: z.coerce.number().int(),
    value: z.coerce.number().int(),
    organization: z.coerce.number().nullable().optional(),
    contact: z.coerce.number(),
    group: z.string(),
    owner: z.string(),
    stage: z.string(),
    account: z.coerce.number().nullable().optional(),
    customerAccount: z.coerce.number().nullable().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    nextdate: z.string().nullable().optional(),
    hash: z.string().optional(),
    winProbability: z.coerce.number().nullable().optional(),
    winProbabilityMdate: z.string().nullable().optional(),
    isDisabled: z.boolean().optional(),
    fields: z
        .array(
            z.object({
                customFieldId: z.coerce.number().int(),
                fieldValue: z.unknown(),
                fieldCurrency: z.string().optional(),
                dealId: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    value: z.number().int(),
    currency: z.string(),
    contact: z.number(),
    owner: z.string(),
    group: z.string(),
    stage: z.string(),
    status: z.number().int(),
    percent: z.number().int().nullable().optional(),
    account: z.number().nullable().optional(),
    organization: z.number().nullable().optional(),
    fields: z
        .array(
            z.object({
                customFieldId: z.number().int(),
                fieldValue: z.unknown(),
                fieldCurrency: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Create a deal in ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.activecampaign.com/reference/create-a-deal-new
            endpoint: '/3/deals',
            data: {
                deal: {
                    title: input.title,
                    value: input.value,
                    currency: input.currency,
                    contact: input.contact,
                    owner: input.owner,
                    group: input.group,
                    stage: input.stage,
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.account !== undefined && { account: input.account }),
                    ...(input.percent !== undefined && { percent: input.percent }),
                    ...(input.status !== undefined && { status: input.status }),
                    ...(input.fields !== undefined && { fields: input.fields })
                }
            },
            retries: 1
        });

        if (!response.data || typeof response.data !== 'object' || !('deal' in response.data)) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'ActiveCampaign did not return a deal in the response'
            });
        }

        const providerDeal = ProviderDealSchema.parse(response.data.deal);

        return {
            id: providerDeal.id,
            title: providerDeal.title,
            value: providerDeal.value,
            currency: providerDeal.currency,
            contact: providerDeal.contact,
            owner: providerDeal.owner,
            group: providerDeal.group,
            stage: providerDeal.stage,
            status: providerDeal.status,
            ...(providerDeal.description !== undefined && { description: providerDeal.description }),
            ...(providerDeal.percent !== undefined && { percent: providerDeal.percent }),
            ...(providerDeal.account !== undefined && { account: providerDeal.account }),
            ...(providerDeal.organization !== undefined && { organization: providerDeal.organization }),
            ...(providerDeal.fields !== undefined && {
                fields: providerDeal.fields.map((field) => ({
                    customFieldId: field.customFieldId,
                    fieldValue: field.fieldValue,
                    ...(field.fieldCurrency !== undefined && { fieldCurrency: field.fieldCurrency })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
