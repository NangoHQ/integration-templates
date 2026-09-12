import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ body: z.object({ file: z.string(), name: z.string().optional() }).passthrough() }).passthrough();
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
    description: 'Upload image file',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postImagesUpload',
        group: 'Images'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/images/upload', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
