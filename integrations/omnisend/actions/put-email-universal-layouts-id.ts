import { createAction } from 'nango';
import * as z from 'zod';
import { emailUniversalLayoutSchema } from '../schemas/email-universal-layout.js';
import { callOmnisend } from '../shared.js';

const input = z.object({ id: z.string().min(1), body: emailUniversalLayoutSchema }).passthrough();
const output = emailUniversalLayoutSchema;

const action = createAction({
    description: 'Update universal layout',
    version: '1.0.0',
    endpoint: { method: 'PUT', path: '/omnisend/putEmailUniversalLayoutsId', group: 'EmailUniversalLayouts' },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'PUT', '/email-universal-layouts/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;