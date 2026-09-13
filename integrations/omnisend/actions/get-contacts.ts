import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend, contactSchema } from '../shared.js';

const input = z
    .object({
        limit: z.number().int().min(1).max(250).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        sort: z.enum(['createdAt', 'updatedAt']).optional(),
        direction: z.enum(['asc', 'desc']).optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        status: z.enum(['subscribed', 'unsubscribed', 'nonSubscribed']).optional(),
        segmentID: z.string().optional(),
        tag: z.string().optional(),
        updatedAtFrom: z.string().optional()
    })
    .passthrough();
const output = z
    .object({
        contacts: z.array(contactSchema).optional(),
        paging: z
            .object({
                cursors: z.object({ after: z.string().nullable().optional(), before: z.string().nullable().optional() }).passthrough().optional(),
                hasMore: z.boolean().optional(),
                limit: z.number().int().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'List contacts',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getContacts',
        group: 'Contacts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/contacts', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
