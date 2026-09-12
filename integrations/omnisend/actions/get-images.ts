import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        limit: z.number().int().min(1).max(250).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        sort: z.enum(['createdAt', 'name']).optional(),
        direction: z.enum(['asc', 'desc']).optional(),
        nameContains: z.string().max(200).optional()
    })
    .passthrough();
const output = z
    .object({
        images: z
            .array(
                z
                    .object({
                        createdAt: z.string().optional(),
                        height: z.number().int().optional(),
                        id: z.string().optional(),
                        name: z.string().optional(),
                        size: z.number().int().optional(),
                        type: z.string().optional(),
                        url: z.string().optional(),
                        width: z.number().int().optional()
                    })
                    .passthrough()
            )
            .optional(),
        paging: z
            .object({
                cursors: z.object({ after: z.string().optional(), before: z.string().optional() }).passthrough().optional(),
                hasMore: z.boolean().optional(),
                limit: z.number().int().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'List images',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getImages',
        group: 'Images'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/images', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
