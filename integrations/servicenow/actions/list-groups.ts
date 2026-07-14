import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset). Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of records to return per page. Example: 10'),
    query: z.string().optional().describe('Encoded query string for filtering records. Example: active=true')
});

const GroupSchema = z
    .object({
        sys_id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        active: z.string().optional(),
        manager: z.unknown().optional(),
        parent: z.unknown().optional(),
        sys_created_on: z.string().optional(),
        sys_updated_on: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    groups: z.array(GroupSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List sys_user_group records.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            sysparm_limit: input.limit ?? 10
        };

        if (input.cursor !== undefined) {
            if (!/^\d+$/.test(input.cursor)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
            const offset = Number(input.cursor);
            if (!Number.isSafeInteger(offset)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
            params['sysparm_offset'] = offset;
        }

        if (input.query !== undefined) {
            params['sysparm_query'] = input.query;
        }

        const config: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/Table-API
            endpoint: '/api/now/table/sys_user_group',
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const rawData = response.data;
        if (rawData === null || typeof rawData !== 'object' || !('result' in rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from ServiceNow Table API.'
            });
        }

        const result = rawData.result;
        if (!Array.isArray(result)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected result array in ServiceNow response.'
            });
        }

        const groups = result.map((item: unknown) => {
            if (item === null || typeof item !== 'object') {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid group record in response.'
                });
            }
            return GroupSchema.parse(item);
        });

        let next_cursor: string | undefined;
        const linkHeader = response.headers?.['link'];
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<[^>]*[?&]sysparm_offset=([^&>]+)[^>]*>;[^,]*rel="next"/);
            if (nextMatch && nextMatch[1]) {
                next_cursor = decodeURIComponent(nextMatch[1]);
            }
        }

        return {
            groups,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
