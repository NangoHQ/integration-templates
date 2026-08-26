import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        filename: z.string().describe('The filename to associate with the uploaded file. Example: "report.pdf"'),
        content: z
            .string()
            .describe(
                'The raw file content to upload as the request body. For text files, pass the text directly. For binary files, pass the bytes as a string.'
            ),
        contentType: z.string().optional().describe('The MIME type of the file. Defaults to application/octet-stream when omitted.')
    })
    .describe('Input for staging a file attachment in Basecamp storage');

const OutputSchema = z
    .object({
        attachable_sgid: z
            .string()
            .describe(
                'The attachable_sgid returned by Basecamp. Use this in a subsequent create-upload call or embed it in message/document/comment rich-text content.'
            )
    })
    .describe('Output containing the attachable_sgid for a staged Basecamp file attachment');

/**
 * @tags: [write]
 * @tagReason: Stages a new file blob in Basecamp storage.
 * @pitfalls: The returned attachable_sgid is only valid for ~1 day and does not attach the file to any project resource by itself; it must be used in a subsequent create-upload call or embedded in rich-text content.
 */
const action = createAction({
    description: 'Upload raw file bytes to Basecamp blob storage and get back an attachable_sgid',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://github.com/basecamp/bc3-api/blob/master/sections/attachments.md
            endpoint: '/attachments.json',
            params: {
                name: input.filename
            },
            data: input.content,
            headers: {
                'Content-Type': input.contentType || 'application/octet-stream'
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = z
            .object({
                attachable_sgid: z.string()
            })
            .parse(response.data);

        return {
            attachable_sgid: providerResponse.attachable_sgid
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
