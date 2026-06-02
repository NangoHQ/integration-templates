import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.union([z.string(), z.number()]).describe('Deal group (pipeline) ID. Example: 1')
});

const DealGroupSchema = z.object({
    allgroups: z.string().optional(),
    allusers: z.string().optional(),
    autoassign: z.string().optional(),
    cdate: z.string().optional(),
    currency: z.string().optional(),
    id: z.string(),
    links: z
        .object({
            dealGroupGroups: z.string().optional(),
            dealGroupUsers: z.string().optional(),
            stages: z.string().optional()
        })
        .optional(),
    stages: z.array(z.string()).optional(),
    title: z.string().optional(),
    udate: z.string().optional()
});

const DealStageSchema = z.object({
    cardRegion1: z.string().optional(),
    cardRegion2: z.string().optional(),
    cardRegion3: z.string().optional(),
    cardRegion4: z.string().optional(),
    cardRegion5: z.string().optional(),
    cdate: z.string().nullable().optional(),
    color: z.string().optional(),
    dealOrder: z.string().optional(),
    group: z.string().optional(),
    id: z.string(),
    links: z
        .object({
            group: z.string().optional()
        })
        .optional(),
    order: z.string().optional(),
    title: z.string().optional(),
    udate: z.string().nullable().optional(),
    width: z.string().optional()
});

const OutputSchema = z.object({
    dealGroup: DealGroupSchema,
    dealStages: z.array(DealStageSchema).optional()
});

const action = createAction({
    description: 'Retrieve a single deal group (pipeline) from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-deal-group',
        group: 'Deals'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const id = typeof input.id === 'number' ? String(input.id) : input.id;
        const encodedId = encodeURIComponent(id);

        // https://developers.activecampaign.com/reference/retrieve-a-pipeline
        const response = await nango.get({
            endpoint: `/3/dealGroups/${encodedId}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Deal group with id ${id} not found.`
            });
        }

        const data = z
            .object({
                dealGroup: z.unknown(),
                dealStages: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        const dealGroup = DealGroupSchema.parse(data.dealGroup);
        const dealStages = data.dealStages ? z.array(DealStageSchema).parse(data.dealStages) : undefined;

        return {
            dealGroup: dealGroup,
            ...(dealStages !== undefined && { dealStages: dealStages })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
