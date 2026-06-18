import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project ID or project name. Example: "MyProject"'),
    team: z.string().describe('Team ID or team name. Must be URL-encoded if it contains spaces. Example: "MyTeam"')
});

const BoardSchema = z.object({
    id: z.string().uuid().describe('Board ID. Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"'),
    name: z.string().describe('Board name. Example: "Backlog"'),
    url: z.string().describe('Full URL to the board resource.')
});

const OutputSchema = z.object({
    boards: z.array(BoardSchema)
});

const action = createAction({
    description: 'List Kanban boards for a team.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-boards',
        group: 'Work'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/work/boards/list?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/${encodeURIComponent(input.team)}/_apis/work/boards`,
            params: {
                'api-version': '7.2-preview.1'
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            count: z.number().optional(),
            value: z.array(z.unknown())
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse the Azure DevOps boards response.',
                errors: providerResponse.error.issues
            });
        }

        const boards = providerResponse.data.value.map((item) => {
            const board = BoardSchema.safeParse(item);
            if (!board.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse a board from the Azure DevOps API response.',
                    errors: board.error.issues
                });
            }
            return board.data;
        });

        return {
            boards
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
