import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';
import { emailTemplateSchema } from '../schemas/email-template.js';

const input = z.object({ body: z.object({ html: z.string(), name: z.string().max(255) }).passthrough() }).passthrough();
const output = emailTemplateSchema;

const action = createAction({
    description: 'Import email template from HTML',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postEmailTemplatesImport',
        group: 'EmailTemplates'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/email-templates/import', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
