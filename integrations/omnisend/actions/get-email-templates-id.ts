import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';
import { emailTemplateSchema } from '../schemas/email-template.js';

const input = z.object({ id: z.string().min(1) }).passthrough();
const output = emailTemplateSchema;

const action = createAction({
    description: 'Get email template',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getEmailTemplatesId',
        group: 'EmailTemplates'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/email-templates/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
