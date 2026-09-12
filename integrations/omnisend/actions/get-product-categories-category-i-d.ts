import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ categoryID: z.string().min(1) }).passthrough();
const output = z
    .object({ categoryID: z.string().optional(), createdAt: z.string().optional(), title: z.string().optional(), updatedAt: z.string().optional() })
    .passthrough();

const action = createAction({
    description: 'Get product category',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getProductCategoriesCategoryID',
        group: 'ProductCategories'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/product-categories/{categoryID}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
