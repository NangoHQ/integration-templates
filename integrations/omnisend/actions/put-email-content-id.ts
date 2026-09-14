import { createAction } from 'nango';
import * as z from 'zod';
import { emailContentSchema } from '../schemas/email-content.js';
import { callOmnisend } from '../shared.js';

const input = z.object({ id: z.string().min(1), body: emailContentSchema }).passthrough();
const output = emailContentSchema;

const action = createAction({
    description: 'Update email content',
    version: '1.0.0',
    endpoint: { method: 'PUT', path: '/omnisend/putEmailContentId', group: 'EmailContent' },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'PUT', '/email-content/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
