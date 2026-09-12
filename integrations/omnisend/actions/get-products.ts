/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"offset": z.unknown().optional(), "limit": z.unknown().optional(), "sort": z.unknown().optional()}).passthrough();
const output = z.object({"paging": z.object({"limit": z.number().optional(), "next": z.string().optional(), "offset": z.number().optional(), "previous": z.string().optional()}).passthrough().optional(), "products": z.array(z.object({"categoryIDs": z.array(z.unknown()).optional(), "createdAt": z.string().optional(), "currency": z.string().optional(), "defaultImageUrl": z.string().optional(), "description": z.string().optional(), "id": z.string().optional(), "images": z.array(z.unknown()).optional(), "status": z.enum(["inStock", "outOfStock", "notAvailable"]).optional(), "tags": z.array(z.unknown()).optional(), "title": z.string().optional(), "type": z.string().optional(), "updatedAt": z.string().optional(), "url": z.string().optional(), "variants": z.array(z.unknown()).optional(), "vendor": z.string().optional()}).passthrough()).optional()}).passthrough();

const action = createAction({
    description: 'List products',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'GET',
        path: '/omnisend/getProducts',
        group: 'Products'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'GET', '/products', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
