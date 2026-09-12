import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        offset: z.number().int().optional(),
        limit: z.number().int().optional(),
        status: z.enum(['pending', 'inProgress', 'finished', 'stopped']).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        endpoint: z.enum(['products', 'contacts', 'events'])
    })
    .passthrough();
const output = z
    .object({
        batches: z
            .array(
                z
                    .object({
                        batchID: z.string().optional(),
                        createdAt: z.string().optional(),
                        endedAt: z.string().optional(),
                        endpoint: z.string().optional(),
                        errors: z
                            .array(
                                z
                                    .object({
                                        itemID: z.string().optional(),
                                        request: z.unknown().optional(),
                                        response: z.unknown().optional(),
                                        responseCode: z.number().int().optional(),
                                        status: z.string().optional()
                                    })
                                    .passthrough()
                            )
                            .optional(),
                        errorsCount: z.number().int().optional(),
                        eventID: z.string().optional(),
                        finishedCount: z.number().int().optional(),
                        method: z.string().optional(),
                        origin: z.string().optional(),
                        responses: z
                            .array(
                                z
                                    .object({
                                        itemID: z.string().optional(),
                                        request: z.unknown().optional(),
                                        response: z.unknown().optional(),
                                        responseCode: z.number().int().optional(),
                                        status: z.string().optional()
                                    })
                                    .passthrough()
                            )
                            .optional(),
                        startedAt: z.string().optional(),
                        status: z.string().optional(),
                        totalCount: z.number().int().optional()
                    })
                    .passthrough()
            )
            .optional(),
        paging: z
            .object({ limit: z.number().int().optional(), next: z.string().optional(), offset: z.number().int().optional(), previous: z.string().optional() })
            .passthrough()
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get batches',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getBatches',
        group: 'Batches'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/batches', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
