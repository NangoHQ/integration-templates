import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend, brandSchema } from '../shared.js';

const input = z.object({}).passthrough();
const output = brandSchema;

const action = createAction({
    description: 'Get information about brand',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getBrandsCurrent',
        group: 'Brands'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/brands/current', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
