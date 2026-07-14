import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    state: z.string().optional().describe('Approval state to filter by. Example: "requested"'),
    sysapproval: z
        .string()
        .optional()
        .describe('Sys ID of the request, change, or other record to filter approvals for. Example: "a8d6cbf9c3ca0310c5a8fc0d050131f5"'),
    limit: z.number().optional().describe('Maximum number of records to return per page. Example: 10'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.')
});

const ReferenceFieldSchema = z
    .object({
        value: z.string(),
        link: z.string()
    })
    .passthrough();

const ProviderApprovalSchema = z
    .object({
        sys_id: z.string(),
        sysapproval: z.union([z.string(), ReferenceFieldSchema]).optional().nullable(),
        state: z.string().optional().nullable(),
        approver: z.union([z.string(), ReferenceFieldSchema]).optional().nullable(),
        comments: z.string().optional().nullable(),
        sys_updated_on: z.string().optional().nullable(),
        sys_created_on: z.string().optional().nullable()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    result: z.array(ProviderApprovalSchema)
});

const OutputSchema = z.object({
    approvals: z.array(ProviderApprovalSchema),
    next_cursor: z.string().optional()
});

function parseNextOffset(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    const links = linkHeader.split(',');
    for (const link of links) {
        const match = link.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
            const nextUrl = match[1];
            if (nextUrl) {
                const offsetMatch = nextUrl.match(/sysparm_offset=([^&]+)/);
                if (offsetMatch) {
                    const offsetValue = offsetMatch[1];
                    if (offsetValue) {
                        return decodeURIComponent(offsetValue);
                    }
                }
            }
        }
    }
    return undefined;
}

const action = createAction({
    description: 'List approval records (sysapproval_approver).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const queryParts: string[] = [];
        if (input.state !== undefined) {
            queryParts.push(`state=${input.state}`);
        }
        if (input.sysapproval !== undefined) {
            queryParts.push(`sysapproval=${input.sysapproval}`);
        }

        const sysparmQuery = queryParts.length > 0 ? queryParts.join('^') : undefined;
        const limit = input.limit ?? 100;
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        // https://developer.servicenow.com/dev.do#!/reference/api/now/table/{tableName}
        const response = await nango.get({
            endpoint: '/api/now/table/sysapproval_approver',
            params: {
                ...(sysparmQuery !== undefined && { sysparm_query: sysparmQuery }),
                sysparm_limit: String(limit),
                sysparm_offset: String(offset)
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const approvals = providerData.result;

        const linkHeader = typeof response.headers['link'] === 'string' ? response.headers['link'] : undefined;
        const nextOffset = parseNextOffset(linkHeader);

        return {
            approvals,
            ...(nextOffset !== undefined && { next_cursor: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
