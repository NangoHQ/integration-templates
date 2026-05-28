import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The Deal id. Example: 1')
});

const ProviderDealSchema = z.object({
    id: z.string(),
    isDisabled: z.boolean(),
    title: z.string(),
    owner: z.string().optional(),
    contact: z.string().optional(),
    organization: z.string().optional(),
    group: z.string().optional(),
    stage: z.string().optional(),
    description: z.string().optional(),
    percent: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    nextdate: z.string().nullish(),
    nexttaskid: z.string().nullish(),
    value: z.string().optional(),
    currency: z.string().optional(),
    winProbability: z.number().optional(),
    winProbabilityMdate: z.string().optional(),
    status: z.string().optional(),
    activitycount: z.string().optional(),
    nextdealid: z.string().optional(),
    edate: z.string().optional(),
    links: z.record(z.string(), z.string()).optional(),
    account: z.string().optional(),
    customerAccount: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    isDisabled: z.boolean(),
    title: z.string(),
    owner: z.string().optional(),
    contact: z.string().optional(),
    organization: z.string().optional(),
    group: z.string().optional(),
    stage: z.string().optional(),
    description: z.string().optional(),
    percent: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    nextdate: z.string().optional(),
    nexttaskid: z.string().optional(),
    value: z.string().optional(),
    currency: z.string().optional(),
    winProbability: z.number().optional(),
    winProbabilityMdate: z.string().optional(),
    status: z.string().optional(),
    activitycount: z.string().optional(),
    nextdealid: z.string().optional(),
    edate: z.string().optional(),
    links: z.record(z.string(), z.string()).optional(),
    account: z.string().optional(),
    customerAccount: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single deal from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-deal',
        group: 'Deals'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.activecampaign.com/reference/retrieve-a-deal
            endpoint: `/3/deals/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        const RawResponseSchema = z.object({
            deal: z.unknown().optional()
        });

        const raw = RawResponseSchema.parse(response.data);

        if (!raw.deal || typeof raw.deal !== 'object' || Array.isArray(raw.deal)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Deal not found',
                id: String(input.id)
            });
        }

        const providerDeal = ProviderDealSchema.parse(raw.deal);

        return {
            id: providerDeal.id,
            isDisabled: providerDeal.isDisabled,
            title: providerDeal.title,
            ...(providerDeal.owner !== undefined && { owner: providerDeal.owner }),
            ...(providerDeal.contact !== undefined && { contact: providerDeal.contact }),
            ...(providerDeal.organization !== undefined && { organization: providerDeal.organization }),
            ...(providerDeal.group !== undefined && { group: providerDeal.group }),
            ...(providerDeal.stage !== undefined && { stage: providerDeal.stage }),
            ...(providerDeal.description !== undefined && { description: providerDeal.description }),
            ...(providerDeal.percent !== undefined && { percent: providerDeal.percent }),
            ...(providerDeal.cdate !== undefined && { cdate: providerDeal.cdate }),
            ...(providerDeal.mdate !== undefined && { mdate: providerDeal.mdate }),
            ...(providerDeal.nextdate != null && { nextdate: providerDeal.nextdate }),
            ...(providerDeal.nexttaskid != null && { nexttaskid: providerDeal.nexttaskid }),
            ...(providerDeal.value !== undefined && { value: providerDeal.value }),
            ...(providerDeal.currency !== undefined && { currency: providerDeal.currency }),
            ...(providerDeal.winProbability !== undefined && { winProbability: providerDeal.winProbability }),
            ...(providerDeal.winProbabilityMdate !== undefined && { winProbabilityMdate: providerDeal.winProbabilityMdate }),
            ...(providerDeal.status !== undefined && { status: providerDeal.status }),
            ...(providerDeal.activitycount !== undefined && { activitycount: providerDeal.activitycount }),
            ...(providerDeal.nextdealid !== undefined && { nextdealid: providerDeal.nextdealid }),
            ...(providerDeal.edate !== undefined && { edate: providerDeal.edate }),
            ...(providerDeal.links !== undefined && { links: providerDeal.links }),
            ...(providerDeal.account !== undefined && { account: providerDeal.account }),
            ...(providerDeal.customerAccount !== undefined && { customerAccount: providerDeal.customerAccount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
