/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"productID": z.string().min(1)}).passthrough();
const output = z.object({"categoryIDs": z.array(z.string()).optional(), "createdAt": z.string().optional(), "currency": z.string(), "defaultImageUrl": z.string().optional(), "description": z.string().optional(), "id": z.string(), "images": z.array(z.string()).optional(), "status": z.enum(["inStock", "outOfStock", "notAvailable"]), "tags": z.array(z.string()).optional(), "title": z.string(), "type": z.string().optional(), "updatedAt": z.string().optional(), "url": z.string(), "variants": z.array(z.object({"defaultImageUrl": z.string().optional(), "description": z.string().optional(), "id": z.string().optional(), "images": z.array(z.unknown()).optional(), "price": z.number().optional(), "sku": z.string().optional(), "status": z.enum(["inStock", "outOfStock", "notAvailable"]).optional(), "strikeThroughPrice": z.number().optional(), "title": z.string().optional(), "url": z.string().optional()}).passthrough()).optional(), "vendor": z.string().optional()}).passthrough();

const action = createAction({
    description: 'Get product',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'GET',
        path: '/omnisend/getProductsProductID',
        group: 'Products'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'GET', '/products/{productID}', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
