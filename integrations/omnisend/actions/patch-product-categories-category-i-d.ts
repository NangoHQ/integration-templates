/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"categoryID": z.string().min(1), body: z.object({"title": z.string().optional()}).passthrough()}).passthrough();
const output = z.object({"categoryID": z.string().optional()}).passthrough();

const action = createAction({
    description: 'Update product category',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'PATCH',
        path: '/omnisend/patchProductCategoriesCategoryID',
        group: 'ProductCategories'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'PATCH', '/product-categories/{categoryID}', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
