import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ segmentID: z.string().min(1) }).passthrough();
const output = z
    .object({
        archivedAt: z.string().nullable().optional(),
        conditionGroups: z
            .array(
                z
                    .object({
                        conditions: z
                            .array(z.object({ entity: z.string().optional(), filters: z.array(z.unknown()), junction: z.string().optional() }).passthrough())
                            .optional()
                    })
                    .passthrough()
            )
            .optional(),
        createdAt: z.string().optional(),
        isStarred: z.boolean().optional(),
        name: z.string().optional(),
        segmentID: z.string().optional(),
        status: z.enum(['ready', 'building', 'archived']).optional(),
        updatedAt: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get segment',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getSegmentsSegmentID',
        group: 'Segments'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/segments/{segmentID}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
