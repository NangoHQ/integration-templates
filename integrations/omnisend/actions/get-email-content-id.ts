import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';
import { emailContentSchema } from '../schemas/email-content.js';

const input = z.object({ id: z.string().min(1) }).passthrough();
const output = emailContentSchema;

const action = createAction({
    description: 'Get email content',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getEmailContentId',
        group: 'EmailContent'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/email-content/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
