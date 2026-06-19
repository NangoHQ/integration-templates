import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('Zoho Mail account ID. Example: "4845214000000008002"'),
    fileName: z.string().describe('Name of the file to upload. Example: "test.txt"'),
    fileContent: z.string().describe('Base64-encoded file content.'),
    isInline: z.boolean().optional().describe('Whether to show the attachment inline in the email body.')
});

const ProviderAttachmentSchema = z.object({
    attachmentSize: z.string().optional(),
    storeName: z.string(),
    attachmentName: z.string(),
    attachmentPath: z.string(),
    url: z.string().optional()
});

const OutputSchema = z.object({
    storeName: z.string(),
    attachmentPath: z.string(),
    attachmentName: z.string(),
    attachmentSize: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Upload a file attachment to Zoho Mail for use in a subsequent send-email call.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.messages.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const rawCredentials = z
            .object({ raw: z.record(z.string(), z.unknown()).optional() })
            .passthrough()
            .safeParse(connection.credentials);
        const rawApiDomain = rawCredentials.success ? rawCredentials.data.raw?.['api_domain'] : undefined;
        const apiDomain = typeof rawApiDomain === 'string' ? rawApiDomain : connection.connection_config?.['api_domain'];
        let baseUrl: string | undefined;
        if (typeof apiDomain === 'string') {
            const trimmed = apiDomain.replace(/\/$/, '');
            const apisMatch = trimmed.match(/^https:\/\/www\.zohoapis\.([a-z.]+)$/);
            if (apisMatch) {
                const ext = apisMatch[1];
                baseUrl = ext === 'ca' ? 'https://mail.zohocloud.ca' : `https://mail.zoho.${ext}`;
            }
        }

        const fileBuffer = Buffer.from(input.fileContent, 'base64');

        const params: Record<string, string | number> = {
            fileName: input.fileName
        };
        if (input.isInline !== undefined) {
            params['isInline'] = String(input.isInline);
        }

        const response = await nango.post({
            // https://www.zoho.com/mail/help/api/post-upload-attachments.html
            endpoint: `/api/accounts/${encodeURIComponent(input.accountId)}/messages/attachments`,
            params,
            data: fileBuffer,
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            baseUrlOverride: baseUrl,
            retries: 3
        });

        const parsed = z
            .object({
                data: ProviderAttachmentSchema
            })
            .parse(response.data);

        const attachment = parsed.data;
        if (!attachment) {
            throw new nango.ActionError({
                type: 'no_attachment',
                message: 'No attachment returned from upload'
            });
        }

        return {
            storeName: attachment.storeName,
            attachmentPath: attachment.attachmentPath,
            attachmentName: attachment.attachmentName,
            ...(attachment.attachmentSize !== undefined && { attachmentSize: attachment.attachmentSize }),
            ...(attachment.url !== undefined && { url: attachment.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
