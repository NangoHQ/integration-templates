import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        limit: z.number().int().min(1).max(50).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        sort: z.enum(['createdAt', 'name']).optional(),
        direction: z.enum(['asc', 'desc']).optional()
    })
    .passthrough();
const output = z
    .object({
        paging: z
            .object({
                cursors: z.object({ after: z.string().optional(), before: z.string().optional() }).passthrough().optional(),
                hasMore: z.boolean().optional(),
                limit: z.number().int().optional()
            })
            .passthrough()
            .optional(),
        segments: z
            .array(
                z
                    .object({
                        archivedAt: z.string().optional(),
                        conditionGroups: z.array(z.object({ conditions: z.array(z.unknown()).optional() }).passthrough()).optional(),
                        createdAt: z.string().optional(),
                        isStarred: z.boolean().optional(),
                        name: z.string().optional(),
                        segmentID: z.string().optional(),
                        status: z.enum(['ready', 'building', 'archived']).optional(),
                        updatedAt: z.string().optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'List segments',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getSegments',
        group: 'Segments'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/segments', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
