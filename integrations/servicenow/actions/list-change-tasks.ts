import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    change_request: z.string().optional().describe('Sys ID of the parent change request to filter by. Example: "ff3687b9c3ca0310c5a8fc0d05013101"'),
    cursor: z.string().optional().describe('Pagination cursor (sysparm_offset). Omit for the first page.'),
    limit: z.number().min(1).max(1000).optional().describe('Maximum number of records to return per page. Defaults to 100.')
});

const SYS_ID_PATTERN = /^[0-9a-f]{32}$/i;

const ChangeTaskSchema = z
    .object({
        sys_id: z.string(),
        number: z.string().optional(),
        short_description: z.string().optional(),
        description: z.string().optional(),
        state: z.string().optional(),
        change_request: z.unknown().optional(),
        sys_updated_on: z.string().optional(),
        sys_created_on: z.string().optional(),
        assigned_to: z.unknown().optional(),
        assignment_group: z.unknown().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    tasks: z.array(ChangeTaskSchema),
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
    description: 'List change tasks.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const offset = input.cursor ?? '0';

        const params: Record<string, string | number> = {
            sysparm_limit: limit,
            sysparm_offset: offset
        };

        if (input.change_request) {
            if (!SYS_ID_PATTERN.test(input.change_request)) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'change_request must be a valid 32-character ServiceNow sys_id.'
                });
            }
            params['sysparm_query'] = `change_request=${input.change_request}`;
        }

        // https://developer.servicenow.com/dev.do#!/reference/api
        const response = await nango.get({
            endpoint: '/api/now/table/change_task',
            params,
            retries: 3
        });

        const rawResult = response.data?.result;
        if (!Array.isArray(rawResult)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from ServiceNow Table API.'
            });
        }

        const tasks = rawResult.map((item: unknown) => {
            const parsed = ChangeTaskSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'A change task record is missing required fields.',
                    details: parsed.error.format()
                });
            }
            return parsed.data;
        });

        const linkHeader = typeof response.headers?.['link'] === 'string' ? response.headers['link'] : undefined;
        const nextCursor = extractNextOffset(linkHeader);

        return {
            tasks,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
