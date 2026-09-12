import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({ body: z.object({ currency: z.string().optional(), platform: z.string(), version: z.string().max(10), website: z.string() }).passthrough() })
    .passthrough();
const output = z.unknown();

const action = createAction({
    description: 'Connect brand',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postBrandsCurrent',
        group: 'Brands'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/brands/current', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
