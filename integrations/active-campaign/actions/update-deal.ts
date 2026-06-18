import { z } from 'zod';
import { createAction } from 'nango';

const CustomFieldSchema = z.object({
    customFieldId: z.number(),
    fieldValue: z.union([z.string(), z.number()]).optional(),
    fieldCurrency: z.string().optional()
});

const InputSchema = z.object({
    id: z.number().describe('The deal ID to update. Example: 1'),
    title: z.string().optional().describe('Deal title'),
    value: z.number().optional().describe('Deal monetary value'),
    currency: z.string().optional().describe('Currency code. Example: "usd"'),
    group: z.string().optional().describe('Pipeline (deal group) ID'),
    stage: z.string().optional().describe('Deal stage ID'),
    owner: z.string().optional().describe('User ID to assign as owner'),
    contact: z.string().optional().describe('Primary contact ID'),
    account: z.string().optional().describe('Account ID'),
    description: z.string().optional().describe('Deal description'),
    percent: z.string().optional().describe('Deal completion percentage'),
    status: z.number().optional().describe('Deal status: 0 = Open, 1 = Won, 2 = Lost'),
    organization: z.string().optional().describe('Organization ID'),
    fields: z.array(CustomFieldSchema).optional().describe('Custom field values')
});

const ProviderDealSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    value: z.union([z.string(), z.number()]).nullable().optional(),
    currency: z.string().nullable().optional(),
    group: z.string().nullable().optional(),
    stage: z.string().nullable().optional(),
    owner: z.string().nullable().optional(),
    contact: z.string().nullable().optional(),
    account: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    percent: z.string().nullable().optional(),
    status: z.union([z.string(), z.number()]).nullable().optional(),
    organization: z.string().nullable().optional(),
    cdate: z.string().nullable().optional(),
    mdate: z.string().nullable().optional(),
    nextdate: z.string().nullable().optional(),
    nexttaskid: z.union([z.string(), z.number()]).nullable().optional(),
    activitycount: z.union([z.string(), z.number()]).nullable().optional(),
    nextdealid: z.string().nullable().optional(),
    edate: z.string().nullable().optional(),
    winProbability: z.union([z.string(), z.number()]).nullable().optional(),
    winProbabilityMdate: z.string().nullable().optional(),
    isDisabled: z.boolean().nullable().optional(),
    hash: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    value: z.union([z.string(), z.number()]).optional(),
    currency: z.string().optional(),
    group: z.string().optional(),
    stage: z.string().optional(),
    owner: z.string().optional(),
    contact: z.string().optional(),
    account: z.string().optional(),
    description: z.string().optional(),
    percent: z.string().optional(),
    status: z.union([z.string(), z.number()]).optional(),
    organization: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    nextdate: z.string().optional(),
    nexttaskid: z.union([z.string(), z.number()]).optional(),
    activitycount: z.union([z.string(), z.number()]).optional(),
    nextdealid: z.string().optional(),
    edate: z.string().optional(),
    winProbability: z.union([z.string(), z.number()]).optional(),
    winProbabilityMdate: z.string().optional(),
    isDisabled: z.boolean().optional(),
    hash: z.string().optional()
});

const action = createAction({
    description: 'Update a deal in ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.title !== undefined) {
            data['title'] = input.title;
        }
        if (input.value !== undefined) {
            data['value'] = input.value;
        }
        if (input.currency !== undefined) {
            data['currency'] = input.currency;
        }
        if (input.group !== undefined) {
            data['group'] = input.group;
        }
        if (input.stage !== undefined) {
            data['stage'] = input.stage;
        }
        if (input.owner !== undefined) {
            data['owner'] = input.owner;
        }
        if (input.contact !== undefined) {
            data['contact'] = input.contact;
        }
        if (input.account !== undefined) {
            data['account'] = input.account;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.percent !== undefined) {
            data['percent'] = input.percent;
        }
        if (input.status !== undefined) {
            data['status'] = input.status;
        }
        if (input.organization !== undefined) {
            data['organization'] = input.organization;
        }
        if (input.fields !== undefined) {
            data['fields'] = input.fields;
        }

        // https://developers.activecampaign.com/reference/update-a-deal-new
        const response = await nango.patch({
            endpoint: `/3/deals/${encodeURIComponent(String(input.id))}`,
            data: {
                deal: data
            },
            retries: 3
        });

        const responseData = z
            .object({
                deal: ProviderDealSchema
            })
            .parse(response.data);

        const deal = responseData.deal;

        return {
            id: deal.id,
            ...(deal.title !== undefined && deal.title !== null && { title: deal.title }),
            ...(deal.value !== undefined && deal.value !== null && { value: deal.value }),
            ...(deal.currency !== undefined && deal.currency !== null && { currency: deal.currency }),
            ...(deal.group !== undefined && deal.group !== null && { group: deal.group }),
            ...(deal.stage !== undefined && deal.stage !== null && { stage: deal.stage }),
            ...(deal.owner !== undefined && deal.owner !== null && { owner: deal.owner }),
            ...(deal.contact !== undefined && deal.contact !== null && { contact: deal.contact }),
            ...(deal.account !== undefined && deal.account !== null && { account: deal.account }),
            ...(deal.description !== undefined && deal.description !== null && { description: deal.description }),
            ...(deal.percent !== undefined && deal.percent !== null && { percent: deal.percent }),
            ...(deal.status !== undefined && deal.status !== null && { status: deal.status }),
            ...(deal.organization !== undefined && deal.organization !== null && { organization: deal.organization }),
            ...(deal.cdate !== undefined && deal.cdate !== null && { cdate: deal.cdate }),
            ...(deal.mdate !== undefined && deal.mdate !== null && { mdate: deal.mdate }),
            ...(deal.nextdate !== undefined && deal.nextdate !== null && { nextdate: deal.nextdate }),
            ...(deal.nexttaskid !== undefined && deal.nexttaskid !== null && { nexttaskid: deal.nexttaskid }),
            ...(deal.activitycount !== undefined && deal.activitycount !== null && { activitycount: deal.activitycount }),
            ...(deal.nextdealid !== undefined && deal.nextdealid !== null && { nextdealid: deal.nextdealid }),
            ...(deal.edate !== undefined && deal.edate !== null && { edate: deal.edate }),
            ...(deal.winProbability !== undefined && deal.winProbability !== null && { winProbability: deal.winProbability }),
            ...(deal.winProbabilityMdate !== undefined && deal.winProbabilityMdate !== null && { winProbabilityMdate: deal.winProbabilityMdate }),
            ...(deal.isDisabled !== undefined && deal.isDisabled !== null && { isDisabled: deal.isDisabled }),
            ...(deal.hash !== undefined && deal.hash !== null && { hash: deal.hash })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
