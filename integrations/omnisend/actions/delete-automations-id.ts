import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ id: z.string().min(1) }).passthrough();
const output = z.unknown();

const action = createAction({
    description: 'Delete automation workflow',
    version: '1.0.0',
    endpoint: {
        method: 'DELETE',
        path: '/omnisend/deleteAutomationsId',
        group: 'Automations'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'DELETE', '/automations/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
