import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ categoryID: z.string().min(1), body: z.object({ title: z.string().max(255) }).passthrough() }).passthrough();
const output = z.object({ categoryID: z.string().optional() }).passthrough();

const action = createAction({
    description: 'Update product category',
    version: '1.0.0',
    endpoint: {
        method: 'PATCH',
        path: '/omnisend/patchProductCategoriesCategoryID',
        group: 'ProductCategories'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'PATCH', '/product-categories/{categoryID}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
