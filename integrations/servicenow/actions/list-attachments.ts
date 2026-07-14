import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    table_name: z.string().describe('ServiceNow table name. Example: "incident"'),
    table_sys_id: z.string().describe('ServiceNow record sys_id. Example: "78058ff5c3ca0310c5a8fc0d0501317d"')
});

const ProviderAttachmentSchema = z.object({
    sys_id: z.string(),
    file_name: z.string().nullable().optional(),
    content_type: z.string().nullable().optional(),
    size_bytes: z.string().nullable().optional(),
    table_name: z.string().nullable().optional(),
    table_sys_id: z.string().nullable().optional(),
    sys_created_on: z.string().nullable().optional(),
    sys_updated_on: z.string().nullable().optional(),
    sys_created_by: z.string().nullable().optional(),
    sys_updated_by: z.string().nullable().optional(),
    download_link: z.string().nullable().optional()
});

const AttachmentOutputSchema = z.object({
    sys_id: z.string(),
    file_name: z.string().optional(),
    size_bytes: z.number().optional(),
    content_type: z.string().optional(),
    download_link: z.string().optional(),
    table_name: z.string().optional(),
    table_sys_id: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional(),
    sys_created_by: z.string().optional(),
    sys_updated_by: z.string().optional()
});

const OutputSchema = z.object({
    attachments: z.array(AttachmentOutputSchema)
});

const action = createAction({
    description: 'List attachment metadata for a table record',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/Attachment
            endpoint: '/api/now/attachment',
            params: {
                sysparm_query: `table_name=${input.table_name}^table_sys_id=${input.table_sys_id}`
            },
            retries: 3
        });

        const result = z
            .object({
                result: z.array(z.unknown())
            })
            .parse(response.data);

        const attachments = result.result.map((raw: unknown) => {
            const att = ProviderAttachmentSchema.parse(raw);

            return {
                sys_id: att.sys_id,
                ...(att.file_name != null && { file_name: att.file_name }),
                ...(att.size_bytes != null && { size_bytes: Number(att.size_bytes) }),
                ...(att.content_type != null && { content_type: att.content_type }),
                ...(att.table_name != null && { table_name: att.table_name }),
                ...(att.table_sys_id != null && { table_sys_id: att.table_sys_id }),
                ...(att.sys_created_on != null && { sys_created_on: att.sys_created_on }),
                ...(att.sys_updated_on != null && { sys_updated_on: att.sys_updated_on }),
                ...(att.sys_created_by != null && { sys_created_by: att.sys_created_by }),
                ...(att.sys_updated_by != null && { sys_updated_by: att.sys_updated_by }),
                ...(att.download_link != null && { download_link: att.download_link })
            };
        });

        return {
            attachments
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
