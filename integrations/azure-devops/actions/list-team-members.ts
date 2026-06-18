import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Project ID or name. Example: "eb6e4656-77fc-42a1-9181-4c6d8e9da5d1"'),
    teamId: z.string().describe('Team ID or name. Example: "564e8204-a90b-4432-883b-d4363c6125ca"')
});

const IdentityRefSchema = z.object({
    id: z.string().optional(),
    displayName: z.string().optional(),
    uniqueName: z.string().optional(),
    url: z.string().optional(),
    imageUrl: z.string().optional()
});

const TeamMemberSchema = z.object({
    identity: IdentityRefSchema.optional(),
    isTeamAdmin: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(TeamMemberSchema),
    count: z.number().optional()
});

const OutputSchema = z.object({
    members: z.array(
        z.object({
            id: z.string().optional(),
            displayName: z.string().optional(),
            uniqueName: z.string().optional(),
            url: z.string().optional(),
            imageUrl: z.string().optional(),
            isTeamAdmin: z.boolean().optional()
        })
    )
});

const action = createAction({
    description: 'List members of a team.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-team-members',
        group: 'Teams'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.project'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/core/teams/get-team-members-with-extended-properties?view=azure-devops-rest-7.2
            endpoint: `/_apis/projects/${encodeURIComponent(input.projectId)}/teams/${encodeURIComponent(input.teamId)}/members`,
            params: {
                'api-version': '7.2-preview.2'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const members = providerResponse.value.map((member) => {
            const identity = member.identity;
            return {
                ...(identity?.id != null && { id: identity.id }),
                ...(identity?.displayName != null && { displayName: identity.displayName }),
                ...(identity?.uniqueName != null && { uniqueName: identity.uniqueName }),
                ...(identity?.url != null && { url: identity.url }),
                ...(identity?.imageUrl != null && { imageUrl: identity.imageUrl }),
                ...(member.isTeamAdmin != null && { isTeamAdmin: member.isTeamAdmin })
            };
        });

        return {
            members
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
