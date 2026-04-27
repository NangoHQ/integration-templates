import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    base_id: z.string().describe('Airtable base ID. Example: "appXXXXXXXXXXXXXX"'),
    record_id: z.string().describe('Airtable record ID. Example: "recXXXXXXXXXXXXXX"'),
    attachment_field_id_or_name: z.string().describe('The ID or name of the multipleAttachments type field. Example: "Attachments"'),
    content_type: z.string().describe('The MIME type of the file. Example: "image/png"'),
    filename: z.string().describe('The name of the file. Example: "example.png"'),
    file: z.string().describe('The file content as a base64-encoded string.')
});

const OutputSchema = z.object({
    id: z.string(),
    created_time: z.string().optional(),
    fields: z.record(z.string(), z.unknown())
});

const action = createAction({
    description: "Upload an attachment into a record's attachment field.",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upload-attachment',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write', 'schema.bases:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/upload-attachment
        const response = await nango.post({
            endpoint: `/v0/${input.base_id}/${input.record_id}/${input.attachment_field_id_or_name}/uploadAttachment`,
            baseUrlOverride: 'https://content.airtable.com',
            data: {
                contentType: input.content_type,
                filename: input.filename,
                file: input.file
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                id: z.string(),
                createdTime: z.string().optional(),
                fields: z.record(z.string(), z.unknown())
            })
            .parse(response.data);

        return {
            id: providerResponse.id,
            ...(providerResponse.createdTime !== undefined && { created_time: providerResponse.createdTime }),
            fields: providerResponse.fields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
