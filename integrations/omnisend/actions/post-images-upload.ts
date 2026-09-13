import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const base64File = z
    .string()
    .min(1)
    .refine((value) => {
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return false;
        // @allowTryCatch: Zod validates this before normal Action execution; keep transport boundary fail-closed.
        try {
            const decoded = Buffer.from(value, 'base64');
            return decoded.length > 0 && decoded.toString('base64') === value;
        } catch {
            return false;
        }
    }, 'file must be valid base64');

const input = z.object({ body: z.object({ file: base64File, name: z.string().optional() }).passthrough() }).passthrough();
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
