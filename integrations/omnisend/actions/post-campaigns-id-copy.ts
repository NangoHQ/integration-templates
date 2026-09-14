import { createAction } from 'nango';
import * as z from 'zod';
import { campaignSchema } from '../schemas/campaign.js';
import { callOmnisend } from '../shared.js';

const input = z.object({ id: z.string().min(1) }).passthrough();
const output = campaignSchema;

const action = createAction({
    description: 'Copy campaign',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postCampaignsIdCopy',
        group: 'Campaigns'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/campaigns/{id}/copy', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
