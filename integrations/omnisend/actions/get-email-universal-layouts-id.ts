import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';
import { emailUniversalLayoutSchema } from '../schemas/email-universal-layout.js';

const input = z.object({ id: z.string().min(1) }).passthrough();
const output = emailUniversalLayoutSchema;

const action = createAction({
    description: 'Get universal layout',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getEmailUniversalLayoutsId',
        group: 'EmailUniversalLayouts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/email-universal-layouts/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
