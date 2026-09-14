import { createAction } from 'nango';
import * as z from 'zod';
import { emailUniversalLayoutSchema } from '../schemas/email-universal-layout.js';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        limit: z.number().int().min(1).max(250).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        nameContains: z.string().max(200).optional()
    })
    .passthrough();
const output = z
    .object({
        paging: z
            .object({
                cursors: z.object({ after: z.string().nullable().optional(), before: z.string().nullable().optional() }).passthrough().optional(),
                hasMore: z.boolean().optional(),
                limit: z.number().int().optional()
            })
            .passthrough()
            .optional(),
        universalLayouts: z.array(emailUniversalLayoutSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get universal layouts',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/omnisend/getEmailUniversalLayouts', group: 'EmailUniversalLayouts' },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/email-universal-layouts', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
