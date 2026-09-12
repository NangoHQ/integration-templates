import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ id: z.string().min(1) }).passthrough();
const output = z.object({}).passthrough();

const action = createAction({
    description: 'Render email template',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postEmailTemplatesIdRender',
        group: 'EmailTemplates'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/email-templates/{id}/render', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
