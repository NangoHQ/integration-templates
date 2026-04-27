import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the base containing the record. Example: "app1234567890abcd"'),
    recordId: z.string().describe('The ID of the record to upload the attachment to. Example: "rec1234567890abcd"'),
    attachmentFieldIdOrName: z.string().describe('The ID or name of the attachment field. Example: "Attachments" or "fld1234567890abcd"'),
    file: z.string().describe('Base64-encoded file content to upload'),
    filename: z.string().describe('The name of the file. Example: "document.pdf"'),
    contentType: z.string().describe('MIME type of the file. Example: "application/pdf" or "image/png"')
});

const AttachmentSchema = z.object({
    id: z.string(),
    url: z.string(),
    filename: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.array(AttachmentSchema)).optional()
});

const action = createAction({
    description: "Upload an attachment into a record's attachment field",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upload-attachment',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/upload-attachment
        // The uploadAttachment endpoint uses content.airtable.com as the base URL
        const response = await nango.post({
            endpoint: `/v0/${input.baseId}/${input.recordId}/${input.attachmentFieldIdOrName}/uploadAttachment`,
            baseUrlOverride: 'https://content.airtable.com',
            data: {
                contentType: input.contentType,
                filename: input.filename,
                file: input.file
            },
            retries: 3
        });

        const responseSchema = z.object({
            id: z.string(),
            createdTime: z.string(),
            fields: z.record(
                z.string(),
                z.array(
                    z.object({
                        id: z.string(),
                        url: z.string(),
                        filename: z.string()
                    })
                )
            )
        });

        const result = responseSchema.parse(response.data);

        return {
            id: result.id,
            createdTime: result.createdTime,
            fields: result.fields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
