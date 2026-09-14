import { createAction } from 'nango';
import * as z from 'zod';
import { emailUniversalLayoutSchema } from '../schemas/email-universal-layout.js';
import { callOmnisend } from '../shared.js';

const input = z.object({ body: emailUniversalLayoutSchema }).passthrough();
const output = emailUniversalLayoutSchema;

const action = createAction({
    description: 'Create universal layout',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/omnisend/postEmailUniversalLayouts', group: 'EmailUniversalLayouts' },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/email-universal-layouts', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
