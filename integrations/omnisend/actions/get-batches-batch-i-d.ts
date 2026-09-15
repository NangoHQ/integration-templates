import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ batchID: z.string().min(1) }).passthrough();
const output = z
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
    .passthrough();

const action = createAction({
    description: 'Get batch information',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getBatchesBatchID',
        group: 'Batches'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/batches/{batchID}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
