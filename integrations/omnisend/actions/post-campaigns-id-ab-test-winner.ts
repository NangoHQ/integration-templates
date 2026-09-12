import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ id: z.string().min(1), body: z.object({ variantID: z.string() }).passthrough() }).passthrough();
const output = z.unknown();

const action = createAction({
    description: 'Select A/B test winner',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postCampaignsIdAbTestWinner',
        group: 'Campaigns'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/campaigns/{id}/ab-test/winner', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
