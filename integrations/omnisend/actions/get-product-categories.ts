/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"offset": z.unknown().optional(), "limit": z.unknown().optional(), "sort": z.unknown().optional()}).passthrough();
const output = z.object({"categories": z.array(z.object({"categoryID": z.string().optional(), "createdAt": z.string().optional(), "title": z.string().optional(), "updatedAt": z.string().optional()}).passthrough()).optional(), "paging": z.object({"limit": z.number().optional(), "next": z.string().optional(), "offset": z.number().optional(), "previous": z.string().optional()}).passthrough().optional()}).passthrough();

const action = createAction({
    description: 'List product categories',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'GET',
        path: '/omnisend/getProductCategories',
        group: 'ProductCategories'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'GET', '/product-categories', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
