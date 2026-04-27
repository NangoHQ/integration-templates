import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the issue label. Example: "abc123-def456"')
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderIssueLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    archivedAt: z.string().nullable().optional(),
    team: ProviderTeamSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    archived: z.boolean(),
    team: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

const action = createAction({
    description: 'Retrieve a Linear issue label by label ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-issue-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query IssueLabel($id: String!) {
                issueLabel(id: $id) {
                    id
                    name
                    color
                    archivedAt
                    team {
                        id
                        name
                    }
                }
            }
        `;

        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const data = response.data;
        if (!isRecord(data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Received an invalid response from Linear.'
            });
        }

        const issueLabel = data['data'];
        if (!isRecord(issueLabel)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Issue label not found for id: ${input.id}`
            });
        }

        const labelValue = issueLabel['issueLabel'];
        if (!isRecord(labelValue)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Issue label not found for id: ${input.id}`
            });
        }

        const label = ProviderIssueLabelSchema.parse(labelValue);

        return {
            id: label.id,
            name: label.name,
            color: label.color,
            archived: label.archivedAt != null,
            ...(label.team != null && {
                team: {
                    id: label.team.id,
                    name: label.team.name
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
