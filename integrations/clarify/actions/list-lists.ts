import { createAction } from 'nango';
import { z } from 'zod';

import { toList } from '../mappers/to-list.js';
import { toPaginationMeta } from '../mappers/to-pagination-meta.js';
import { ClarifyList, ClarifyPaginationMeta } from '../models.js';
import type { ClarifyListResource, ClarifyPaginatedResponse } from '../types.js';

const ListListsInput = z.object({
    limit: z.number().int().positive().max(1000).optional().describe('Page size (default 50 on the Clarify API).'),
    offset: z.number().int().min(0).optional().describe('Records to skip before this page.'),
    entity: z.string().optional().describe('Filter lists by object type (e.g. person, company, deal).')
});

const ListListsOutput = z.object({
    lists: z.array(ClarifyList),
    meta: ClarifyPaginationMeta,
    nextOffset: z.number().optional().describe('Pass as offset to fetch the next page, if more results exist.')
});

const action = createAction({
    description: 'List Clarify workspace lists across all object types.',
    version: '1.0.0',
    input: ListListsInput,
    output: ListListsOutput,

    exec: async (nango, input): Promise<z.infer<typeof ListListsOutput>> => {
        // https://developer.clarify.ai/docs/api-reference/lists/getWorkspaceLists
        const params: Record<string, string> = {};

        if (input.limit !== undefined) {
            params['page[limit]'] = String(input.limit);
        }
        if (input.offset !== undefined) {
            params['page[offset]'] = String(input.offset);
        }
        if (input.entity !== undefined) {
            params['filter[entity]'] = input.entity;
        }

        const response = await nango.get<ClarifyPaginatedResponse<ClarifyListResource>>({
            endpoint: '/lists',
            params,
            retries: 3
        });

        const meta = toPaginationMeta(response.data.meta);
        const lists = response.data.data.map(toList);
        const nextOffset = meta.offset + meta.limit < meta.totalRecords ? meta.offset + meta.limit : undefined;

        return {
            lists,
            meta,
            ...(nextOffset !== undefined && { nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
