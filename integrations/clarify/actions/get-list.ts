import { createAction } from 'nango';
import { z } from 'zod';

import { getWorkspaceApiBase } from '../utils/workspace-api-path.js';

const ClarifyListAttributes = z.object({
    _id: z.string(),
    entity: z.string(),
    title: z.string(),
    emoji: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.string().optional(),
    state: z.string().optional(),
    _created_at: z.string().optional(),
    _updated_at: z.string().optional()
});

const ClarifyListResource = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ClarifyListAttributes
});

const ClarifySingleList = z.object({
    data: ClarifyListResource
});

const ClarifyList = z.object({
    id: z.string(),
    title: z.string(),
    entity: z.string(),
    emoji: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.string().optional(),
    state: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

function toList(resource: z.infer<typeof ClarifyListResource>): z.infer<typeof ClarifyList> {
    const { attributes } = resource;

    return {
        id: resource.id,
        title: attributes.title,
        entity: attributes.entity,
        emoji: attributes.emoji ?? null,
        description: attributes.description ?? null,
        type: attributes.type,
        state: attributes.state,
        createdAt: attributes._created_at,
        updatedAt: attributes._updated_at
    };
}

const GetListInput = z.object({
    object: z.string().describe('Object type (person, company, deal, or a custom c_* object).'),
    listId: z.string().describe('Unique ID of the list.')
});

const action = createAction({
    description: 'Fetch a single Clarify list by object type and list ID.',
    version: '1.0.2',
    input: GetListInput,
    output: ClarifyList,

    exec: async (nango, input): Promise<z.infer<typeof ClarifyList>> => {
        // https://developer.clarify.ai/docs/api-reference/lists/getList
        const workspaceBase = await getWorkspaceApiBase(nango);
        const response = await nango.get({
            endpoint: `${workspaceBase}/objects/${encodeURIComponent(input.object)}/lists/${encodeURIComponent(input.listId)}`,
            retries: 3
        });

        const parsed = ClarifySingleList.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from the Clarify list API.',
                details: parsed.error.issues
            });
        }

        return toList(parsed.data.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
