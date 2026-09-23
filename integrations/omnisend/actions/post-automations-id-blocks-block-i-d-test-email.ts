import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({ id: z.string().min(1), blockID: z.string().min(1), body: z.object({ recipients: z.array(z.string().email()).min(1) }).passthrough() })
    .passthrough();
const output = z.unknown();

const action = createAction({
    description: 'Send test email',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postAutomationsIdBlocksBlockIDTestEmail',
        group: 'Automations'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/automations/{id}/blocks/{blockID}/test-email', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
