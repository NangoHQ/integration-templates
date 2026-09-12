import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ segmentID: z.string().min(1) }).passthrough();
const output = z.object({ contactsCount: z.number().int().optional() }).passthrough();

const action = createAction({
    description: 'Get segment statistics',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getSegmentsSegmentIDStatistics',
        group: 'Segments'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/segments/{segmentID}/statistics', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
