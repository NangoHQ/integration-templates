import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        body: z
            .object({
                contactIDs: z.array(z.string().min(1)).optional(),
                emails: z.array(z.string().min(1)).optional(),
                phones: z.array(z.string().min(1)).optional(),
                segmentID: z.string().min(1).optional(),
                tags: z.array(z.string()).min(1)
            })
            .passthrough()
            .superRefine((body, ctx) => {
                const hasTarget =
                    [body.contactIDs, body.emails, body.phones].some((values) => Array.isArray(values) && values.length > 0) || Boolean(body.segmentID);
                if (!hasTarget) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one contact identifier or segmentID is required' });
            })
    })
    .passthrough();
const output = z.unknown();

const action = createAction({
    description: 'Batch remove tags',
    version: '1.0.0',
    endpoint: {
        method: 'DELETE',
        path: '/omnisend/deleteContactsTags',
        group: 'Contacts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'DELETE', '/contacts/tags', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
