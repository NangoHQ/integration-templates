import { createAction } from 'nango';
import { z } from 'zod';

import { toList } from '../mappers/to-list.js';
import { ClarifyList } from '../models.js';
import type { ClarifyListResource, ClarifySingleResourceResponse } from '../types.js';
import { getWorkspaceApiBase } from '../utils/workspace-api-path.js';

const GetListInput = z.object({
    object: z.string().describe('Object type (person, company, deal, or a custom c_* object).'),
    listId: z.string().describe('Unique ID of the list.')
});

const action = createAction({
    description: 'Fetch a single Clarify list by object type and list ID.',
    version: '1.0.1',
    input: GetListInput,
    output: ClarifyList,

    exec: async (nango, input): Promise<ClarifyList> => {
        // https://developer.clarify.ai/docs/api-reference/lists/getList
        const workspaceBase = await getWorkspaceApiBase(nango);
        const response = await nango.get<ClarifySingleResourceResponse<ClarifyListResource>>({
            endpoint: `${workspaceBase}/objects/${encodeURIComponent(input.object)}/lists/${encodeURIComponent(input.listId)}`,
            retries: 3
        });

        return toList(response.data.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
