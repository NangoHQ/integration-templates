import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        limit: z.number().int().min(1).max(100).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        sort: z.enum(['createdAt', 'name']).optional(),
        direction: z.enum(['asc', 'desc']).optional(),
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
        templates: z
            .array(
                z
                    .object({
                        createdAt: z.string().optional(),
                        id: z.string().optional(),
                        name: z.string().max(255).optional(),
                        updatedAt: z.string().optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get email templates',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getEmailTemplates',
        group: 'EmailTemplates'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/email-templates', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
