import { createAction } from 'nango';
import { z } from 'zod';

import { toList } from '../mappers/to-list.js';
import { toPaginationMeta } from '../mappers/to-pagination-meta.js';
import { ClarifyList, ClarifyPaginationMeta } from '../models.js';
import type { ClarifyListResource, ClarifyPaginatedResponse, ClarifyPaginationMeta as ClarifyPaginationMetaApi } from '../types.js';
import { getWorkspaceApiBase } from '../utils/workspace-api-path.js';

const ListListsInput = z.object({
    limit: z.number().int().positive().max(1000).optional().describe('Page size (default 50 on the Clarify API).'),
    offset: z.number().int().min(0).optional().describe('Records to skip before this page.'),
    entity: z.string().optional().describe('Filter lists by object type (e.g. person, company, deal).'),
    listType: z
        .enum(['static', 'dynamic', 'all'])
        .optional()
        .default('all')
        .describe('Which list types to return. Clarify excludes dynamic lists unless filter[type] is set; default all fetches static and dynamic.')
});

const ListListsOutput = z.object({
    lists: z.array(ClarifyList),
    meta: ClarifyPaginationMeta,
    nextOffset: z.number().optional().describe('Pass as offset to fetch the next page, if more results exist.')
});

function buildParams(input: z.infer<typeof ListListsInput>, listType: 'static' | 'dynamic'): Record<string, string> {
    const params: Record<string, string> = {
        'filter[type]': listType
    };

    if (input.limit !== undefined) {
        params['page[limit]'] = String(input.limit);
    }
    if (input.offset !== undefined) {
        params['page[offset]'] = String(input.offset);
    }
    if (input.entity !== undefined) {
        params['filter[entity]'] = input.entity;
    }

    return params;
}

function hasNextPage(meta: ClarifyPaginationMetaApi): boolean {
    return meta.offset + meta.limit < meta.total_records;
}

const action = createAction({
    description: 'List Clarify workspace lists across all object types.',
    version: '1.0.2',
    input: ListListsInput,
    output: ListListsOutput,

    exec: async (nango, input): Promise<z.infer<typeof ListListsOutput>> => {
        // https://developer.clarify.ai/docs/api-reference/lists/getWorkspaceLists
        const workspaceBase = await getWorkspaceApiBase(nango);
        const listTypeMode = input.listType ?? 'all';
        const typesToFetch: Array<'static' | 'dynamic'> =
            listTypeMode === 'all' ? ['static', 'dynamic'] : [listTypeMode];

        const listsById = new Map<string, ClarifyList>();
        const pageMetas: ClarifyPaginationMetaApi[] = [];

        for (const listType of typesToFetch) {
            const response = await nango.get<ClarifyPaginatedResponse<ClarifyListResource>>({
                endpoint: `${workspaceBase}/lists`,
                params: buildParams(input, listType),
                retries: 3
            });

            for (const resource of response.data.data) {
                listsById.set(resource.id, toList(resource));
            }

            pageMetas.push(response.data.meta);
        }

        const lists = [...listsById.values()];
        const limit = pageMetas[0]?.limit ?? input.limit ?? 50;
        const offset = pageMetas[0]?.offset ?? input.offset ?? 0;
        const totalRecords = pageMetas.reduce((sum, meta) => sum + meta.total_records, 0);
        const anyTypeHasNextPage = pageMetas.some(hasNextPage);

        const meta: ClarifyPaginationMeta = {
            totalRecords,
            totalPages: limit > 0 ? Math.ceil(totalRecords / limit) : 0,
            offset,
            limit
        };

        return {
            lists,
            meta,
            ...(anyTypeHasNextPage && { nextOffset: offset + limit })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
