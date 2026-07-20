import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    table_name: z.string().describe('ServiceNow table name. Example: "incident"'),
    table_sys_id: z.string().describe('ServiceNow record sys_id. Example: "78058ff5c3ca0310c5a8fc0d0501317d"'),
    cursor: z.string().optional().describe('Pagination cursor (sysparm_offset) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of records to return per page. Defaults to 100.')
});

const SYS_ID_PATTERN = /^[0-9a-f]{32}$/i;
const TABLE_NAME_PATTERN = /^[a-z0-9_]+$/i;

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
    attachments: z.array(AttachmentOutputSchema),
    next_cursor: z.string().optional()
});

function extractNextOffset(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    const parts = linkHeader.split(',');
    for (const part of parts) {
        const match = part.match(/<([^>]+)>;\s*rel="next"/);
        if (match && match[1]) {
            // @allowTryCatch Malformed URLs in the Link header should not fail the entire action.
            try {
                const url = new URL(match[1]);
                const offset = url.searchParams.get('sysparm_offset');
                if (offset) {
                    return offset;
                }
            } catch {
                return undefined;
            }
        }
    }
    return undefined;
}

const action = createAction({
    description: 'List attachment metadata for a table record',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!TABLE_NAME_PATTERN.test(input.table_name)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'table_name must contain only letters, numbers, and underscores.'
            });
        }

        if (!SYS_ID_PATTERN.test(input.table_sys_id)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'table_sys_id must be a valid 32-character ServiceNow sys_id.'
            });
        }

        let offset = 0;
        if (input.cursor !== undefined) {
            if (!/^\d+$/.test(input.cursor)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
            offset = Number(input.cursor);
            if (!Number.isSafeInteger(offset)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
        }

        const limit = input.limit ?? 100;

        const response = await nango.get({
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/Attachment
            endpoint: '/api/now/attachment',
            params: {
                sysparm_query: `table_name=${input.table_name}^table_sys_id=${input.table_sys_id}`,
                sysparm_limit: String(limit),
                sysparm_offset: String(offset)
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

        const linkHeader =
            typeof response.headers === 'object' && response.headers !== null ? (response.headers['link'] ?? response.headers['Link']) : undefined;
        const nextCursor = extractNextOffset(typeof linkHeader === 'string' ? linkHeader : undefined);

        return {
            attachments,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
