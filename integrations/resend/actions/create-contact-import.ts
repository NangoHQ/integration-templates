import { randomBytes } from 'crypto';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: contacts/create-import
// The provider accepts this operation only as multipart/form-data with the CSV in a form field named "file".
const InputSchema = z.object({
    body: z.object({
        file: z
            .string()
            .min(1)
            .describe('CSV file contents to import, as text. The first row must be a header row. Example: "email,first_name\\nsteve@example.com,Steve"'),
        filename: z.string().optional().describe('File name sent with the CSV form field. Defaults to "contacts.csv". Example: "contacts.csv"'),
        column_map: z
            .object({
                email: z.string().optional(),
                first_name: z.string().optional(),
                last_name: z.string().optional(),
                unsubscribed: z.string().optional(),
                properties: z.record(z.string(), z.object({ column: z.string(), type: z.enum(['string', 'number']) }).passthrough()).optional()
            })
            .passthrough()
            .optional()
            .describe('Maps CSV column headers to contact fields. Example: {"email": "Email", "first_name": "First Name"}'),
        on_conflict: z.enum(['upsert', 'skip']).optional().describe('How to handle contacts that already exist. Example: "upsert"'),
        segments: z
            .array(z.object({ id: z.string() }).passthrough())
            .optional()
            .describe('Segments to add the imported contacts to. Example: [{"id": "78e7a5c6-9a91-4c63-9d1f-3b9c0b5b9ab6"}]'),
        topics: z
            .array(z.object({ id: z.string(), subscription: z.enum(['opt_in', 'opt_out']) }).passthrough())
            .optional()
            .describe(
                'Topic subscriptions to apply to the imported contacts. Example: [{"id": "059ac693-2fc8-4c13-8b27-01350d638a17", "subscription": "opt_in"}]'
            )
    })
});

const ProviderResponseSchema = z.object({ object: z.string().optional(), id: z.string().optional() }).passthrough();
const OutputSchema = ProviderResponseSchema;

function formField(boundary: string, name: string, value: string): string {
    return `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
}

const action = createAction({
    description: 'Create a contact import in Resend from CSV contents.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // A random boundary per request keeps CSV contents from being parsed as additional form parts.
        const boundary = `----NangoResendContactImport${randomBytes(16).toString('hex')}`;
        const filename = (input.body.filename ?? 'contacts.csv').replace(/["\r\n]/g, '_');
        let body =
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
            `Content-Type: text/csv\r\n\r\n` +
            `${input.body.file}\r\n`;
        if (input.body.column_map !== undefined) body += formField(boundary, 'column_map', JSON.stringify(input.body.column_map));
        if (input.body.on_conflict !== undefined) body += formField(boundary, 'on_conflict', input.body.on_conflict);
        if (input.body.segments !== undefined) body += formField(boundary, 'segments', JSON.stringify(input.body.segments));
        if (input.body.topics !== undefined) body += formField(boundary, 'topics', JSON.stringify(input.body.topics));
        body += `--${boundary}--\r\n`;

        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/contacts/imports`,
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
            data: body,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Retrying a non-idempotent POST can duplicate side effects.
            retries: 0
        };
        const response = await nango.post(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
