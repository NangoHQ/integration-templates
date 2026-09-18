import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ id: z.string().min(1) }).passthrough();
const output = z
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
    .passthrough();

const action = createAction({
    description: 'Get image',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getImagesId',
        group: 'Images'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/images/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
