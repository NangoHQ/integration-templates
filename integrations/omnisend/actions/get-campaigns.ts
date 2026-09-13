import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';
import { campaignSchema } from '../schemas/campaign.js';

const input = z
    .object({
        limit: z.number().int().min(1).max(250).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        sort: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
        direction: z.enum(['asc', 'desc']).optional(),
        status: z.array(z.enum(['error', 'onHold', 'sent', 'paused', 'started', 'stopped', 'expired', 'draft', 'scheduled', 'canceled'])).optional(),
        nameContains: z.string().max(200).optional(),
        channel: z.array(z.enum(['email', 'sms', 'push'])).optional(),
        type: z.enum(['regular', 'booster', 'abTest']).optional(),
        parentCampaignID: z.string().optional(),
        createdAtFrom: z.string().optional(),
        createdAtTo: z.string().optional(),
        updatedAtFrom: z.string().optional(),
        updatedAtTo: z.string().optional()
    })
    .passthrough();
const output = z
    .object({
        campaigns: z.array(campaignSchema).optional(),
        paging: z
            .object({
                cursors: z.object({ after: z.string().nullable().optional(), before: z.string().nullable().optional() }).passthrough().optional(),
                hasMore: z.boolean().optional(),
                limit: z.number().int().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'List campaigns with filtering, sorting, and cursor pagination',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getCampaigns',
        group: 'Campaigns'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/campaigns', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
