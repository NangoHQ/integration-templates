import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(250).optional(),
        sort: z.enum(['date', 'updatedAt', 'createdAt']).optional()
    })
    .passthrough();
const output = z
    .object({
        paging: z
            .object({
                limit: z.number().int().optional(),
                next: z.string().nullable().optional(),
                offset: z.number().int().optional(),
                previous: z.string().nullable().optional()
            })
            .passthrough()
            .optional(),
        products: z
            .array(
                z
                    .object({
                        categoryIDs: z.array(z.string()).optional(),
                        createdAt: z.string().optional(),
                        currency: z.string(),
                        defaultImageUrl: z.string().max(1000).optional(),
                        description: z.string().max(1000).optional(),
                        id: z.string().max(100),
                        images: z.array(z.string()).optional(),
                        status: z.enum(['inStock', 'outOfStock', 'notAvailable']),
                        tags: z.array(z.string()).optional(),
                        title: z.string().max(255),
                        type: z.string().max(100).optional(),
                        updatedAt: z.string().optional(),
                        url: z.string().max(1000),
                        variants: z
                            .array(
                                z
                                    .object({
                                        defaultImageUrl: z.string().max(1000).optional(),
                                        description: z.string().max(1000).optional(),
                                        id: z.string().max(100),
                                        images: z.array(z.string()).optional(),
                                        price: z.number(),
                                        sku: z.string().max(255).optional(),
                                        status: z.enum(['inStock', 'outOfStock', 'notAvailable']).optional(),
                                        strikeThroughPrice: z.number().optional(),
                                        title: z.string().max(255),
                                        url: z.string().max(1000)
                                    })
                                    .passthrough()
                            )
                            .optional(),
                        vendor: z.string().max(100).optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'List products',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getProducts',
        group: 'Products'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/products', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
