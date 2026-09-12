/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"productID": z.string().min(1), body: z.object({"categoryIDs": z.array(z.string()).optional(), "createdAt": z.string().optional(), "currency": z.string().optional(), "defaultImageUrl": z.string().optional(), "description": z.string().optional(), "id": z.string().optional(), "images": z.array(z.string()).optional(), "status": z.enum(["inStock", "outOfStock", "notAvailable"]).optional(), "tags": z.array(z.string()).optional(), "title": z.string().optional(), "type": z.string().optional(), "updatedAt": z.string().optional(), "url": z.string().optional(), "variants": z.array(z.object({"defaultImageUrl": z.unknown().optional(), "description": z.unknown().optional(), "id": z.unknown(), "images": z.unknown().optional(), "price": z.unknown(), "sku": z.unknown().optional(), "status": z.unknown().optional(), "strikeThroughPrice": z.unknown().optional(), "title": z.unknown(), "url": z.unknown()}).passthrough()).optional(), "vendor": z.string().optional()}).passthrough()}).passthrough();
const output = z.object({"id": z.string().optional()}).passthrough();

const action = createAction({
    description: 'Replace product',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'PUT',
        path: '/omnisend/putProductsProductID',
        group: 'Products'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'PUT', '/products/{productID}', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
