import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({ offset: z.number().int().optional(), limit: z.number().int().optional(), sort: z.enum(['title', 'updatedAt', 'createdAt']).optional() })
    .passthrough();
const output = z
    .object({
        categories: z
            .array(
                z
                    .object({
                        categoryID: z.string().optional(),
                        createdAt: z.string().optional(),
                        title: z.string().optional(),
                        updatedAt: z.string().optional()
                    })
                    .passthrough()
            )
            .optional(),
        paging: z
            .object({
                limit: z.number().int().optional(),
                next: z.string().optional(),
                offset: z.number().int().optional(),
                previous: z.string().nullable().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'List product categories',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getProductCategories',
        group: 'ProductCategories'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/product-categories', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
