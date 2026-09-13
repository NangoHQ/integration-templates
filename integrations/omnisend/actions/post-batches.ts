import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        body: z
            .object({
                endpoint: z.enum(['products', 'contacts', 'events', 'categories']),
                items: z.array(z.unknown()).min(1).max(100),
                method: z.enum(['POST', 'PUT']),
                origin: z.string().optional()
            })
            .passthrough()
    })
    .passthrough();
const output = z.object({ batchID: z.string().optional(), totalCount: z.number().int().optional() }).passthrough();

const action = createAction({
    description: 'Create batch',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postBatches',
        group: 'Batches'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/batches', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
