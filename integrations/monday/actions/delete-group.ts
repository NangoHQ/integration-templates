import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('The board\'s unique identifier. Example: "5096980653"'),
    group_id: z.string().describe('The group\'s unique identifier. Example: "topics"'),
    permanent: z.boolean().optional().describe('If true, permanently deletes the group. If false or omitted, archives the group (soft delete).')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function extractGraphQLErrors(rawData: Record<string, unknown>): string | undefined {
    const errors = rawData['errors'];
    if (Array.isArray(errors) && errors.length > 0) {
        return errors
            .map((err) => {
                if (isRecord(err) && typeof err['message'] === 'string') {
                    return err['message'];
                }
                return String(err);
            })
            .join('; ');
    }
    return undefined;
}

const action = createAction({
    description: 'Delete or archive a group in monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const isPermanent = input.permanent === true;
        const mutationName = isPermanent ? 'delete_group' : 'archive_group';
        const returnField = isPermanent ? 'deleted' : 'archived';

        // https://developer.monday.com/api-reference/reference/groups
        const response = await nango.post({
            endpoint: '/v2',
            data: {
                query: `mutation ($boardId: ID!, $groupId: String!) { ${mutationName}(board_id: $boardId, group_id: $groupId) { id ${returnField} } }`,
                variables: {
                    boardId: input.board_id,
                    groupId: input.group_id
                }
            },
            retries: 1
        });

        const rawData = response.data;
        if (!isRecord(rawData)) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from monday.com API'
            });
        }

        const graphQLErrorMessage = extractGraphQLErrors(rawData);
        if (graphQLErrorMessage) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: graphQLErrorMessage
            });
        }

        const mutationResult = rawData['data'];
        if (!isRecord(mutationResult)) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response structure from monday.com API'
            });
        }

        const groupData = mutationResult[mutationName];
        if (!isRecord(groupData)) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Mutation ${mutationName} did not return group data`
            });
        }

        const providerGroup = ProviderGroupSchema.parse(groupData);

        return {
            id: providerGroup.id,
            ...(providerGroup.archived !== undefined && { archived: providerGroup.archived }),
            ...(providerGroup.deleted !== undefined && { deleted: providerGroup.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
