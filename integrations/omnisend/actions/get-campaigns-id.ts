import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';
import { campaignSchema } from '../schemas/campaign.js';

const input = z.object({ id: z.string().min(1) }).passthrough();
const output = campaignSchema;

const action = createAction({
    description: 'Get campaign',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getCampaignsId',
        group: 'Campaigns'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/campaigns/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
