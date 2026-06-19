import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DealStageSchema = z.object({
    cardRegion1: z.string(),
    cardRegion2: z.string(),
    cardRegion3: z.string(),
    cardRegion4: z.string(),
    cardRegion5: z.string(),
    cdate: z.string().nullable().optional(),
    color: z.string(),
    dealOrder: z.string(),
    group: z.string(),
    id: z.string(),
    links: z
        .object({
            group: z.string()
        })
        .optional(),
    order: z.string(),
    title: z.string(),
    udate: z.string().nullable().optional(),
    width: z.string()
});

const DealStagesResponseSchema = z.object({
    dealStages: z.array(DealStageSchema),
    meta: z.object({
        total: z.union([z.string(), z.number()]).optional()
    })
});

const InputSchema = z.object({
    title: z.string().optional().describe('Filter by deal stage title (partial match)'),
    pipelineId: z.string().optional().describe('Filter by pipeline ID'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results per page (max 100)'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from previous response'),
    orderTitle: z.string().optional().describe('Order by title, e.g. ASC or DESC')
});

const OutputSchema = z.object({
    dealStages: z.array(DealStageSchema),
    meta: z.object({
        total: z.union([z.string(), z.number()]).optional()
    }),
    nextCursor: z.string().optional().describe('Pagination cursor for the next page')
});

const action = createAction({
    description: 'List deal stages from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(offset)) {
            throw new nango.ActionError({ message: 'Invalid cursor: must be a numeric offset' });
        }

        const params: Record<string, string | number> = {};
        if (input.title) {
            params['filters[title]'] = input.title;
        }
        if (input.pipelineId) {
            params['filters[d_groupid]'] = input.pipelineId;
        }
        if (input.orderTitle) {
            params['orders[title]'] = input.orderTitle;
        }
        if (input.limit) {
            params['limit'] = input.limit;
        }
        if (offset > 0) {
            params['offset'] = offset;
        }

        const config: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/list-all-deal-stages
            endpoint: '/3/dealStages',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = DealStagesResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({ message: 'Unexpected response from ActiveCampaign', details: parsed.error.format() });
        }

        const { dealStages, meta } = parsed.data;
        const total = meta.total !== undefined ? Number(meta.total) : undefined;
        const nextCursor = total !== undefined && offset + dealStages.length < total ? String(offset + dealStages.length) : undefined;

        return {
            dealStages,
            meta,
            nextCursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
