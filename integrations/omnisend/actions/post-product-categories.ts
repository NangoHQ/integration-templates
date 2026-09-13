import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ body: z.object({ categoryID: z.string().min(1).max(100), title: z.string().min(1).max(255) }).passthrough() }).passthrough();
const output = z.object({ categoryID: z.string().optional() }).passthrough();

const action = createAction({
    description: 'Create product category',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postProductCategories',
        group: 'ProductCategories'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/product-categories', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
