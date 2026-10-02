import { createAction } from 'nango';
import { z } from 'zod';

import { toPaginationMeta } from '../mappers/to-pagination-meta.js';
import { toResource } from '../mappers/to-resource.js';
import { ClarifyPaginationMeta, ClarifyResource } from '../models.js';
import type { ClarifyPaginatedResponse, ClarifyRecordResource } from '../types.js';
import { getWorkspaceApiBase } from '../utils/workspace-api-path.js';

const ListListResourcesInput = z.object({
    object: z.string().describe('Object type (person, company, deal, or a custom c_* object).'),
    listId: z.string().describe('Unique ID of the list.'),
    limit: z.number().int().positive().max(1000).optional().describe('Page size (default 50 on the Clarify API).'),
    offset: z.number().int().min(0).optional().describe('Records to skip before this page.')
});

const ListListResourcesOutput = z.object({
    resources: z.array(ClarifyResource),
    meta: ClarifyPaginationMeta,
    nextOffset: z.number().optional().describe('Pass as offset to fetch the next page, if more results exist.')
});

const action = createAction({
    description: 'List records that belong to a Clarify list.',
    version: '1.0.1',
    input: ListListResourcesInput,
    output: ListListResourcesOutput,

    exec: async (nango, input): Promise<z.infer<typeof ListListResourcesOutput>> => {
        // https://developer.clarify.ai/docs/api-reference/resources/getListResources
        const params: Record<string, string> = {};

        if (input.limit !== undefined) {
            params['page[limit]'] = String(input.limit);
        }
        if (input.offset !== undefined) {
            params['page[offset]'] = String(input.offset);
        }

        const workspaceBase = await getWorkspaceApiBase(nango);
        const response = await nango.get<ClarifyPaginatedResponse<ClarifyRecordResource>>({
            endpoint: `${workspaceBase}/objects/${encodeURIComponent(input.object)}/lists/${encodeURIComponent(input.listId)}/resources`,
            params,
            retries: 3
        });

        const meta = toPaginationMeta(response.data.meta);
        const resources = response.data.data.map(toResource);
        const nextOffset = meta.offset + meta.limit < meta.totalRecords ? meta.offset + meta.limit : undefined;

        return {
            resources,
            meta,
            ...(nextOffset !== undefined && { nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
