import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the team to create. Example: "Sales Team"')
});

const ProviderTeamSchema = z.object({
    id: z.number().describe('Team ID. Example: 1429341'),
    account_id: z.number().describe('Account ID. Example: 482622'),
    name: z.string().describe('Team name. Example: "Sales Team"'),
    parent_id: z.number().nullable().describe('Parent team ID. Example: 123'),
    created_at: z.string().describe('Creation timestamp. Example: "2026/08/05 09:53:03 -0400"'),
    updated_at: z.string().describe('Update timestamp. Example: "2026/08/05 09:53:03 -0400"'),
    permissions: z.object({}).passthrough().describe('Team permissions object'),
    height: z.number().nullable().describe('Team height in the hierarchy. Example: 0'),
    depth: z.number().nullable().describe('Team depth in the hierarchy. Example: 0')
});

const OutputSchema = z.object({
    id: z.number().describe('Team ID. Example: 1429341'),
    account_id: z.number().describe('Account ID. Example: 482622'),
    name: z.string().describe('Team name. Example: "Sales Team"'),
    parent_id: z.number().nullable().describe('Parent team ID. Example: 123'),
    created_at: z.string().describe('Creation timestamp. Example: "2026/08/05 09:53:03 -0400"'),
    updated_at: z.string().describe('Update timestamp. Example: "2026/08/05 09:53:03 -0400"'),
    permissions: z.object({}).passthrough().describe('Team permissions object'),
    height: z.number().nullable().describe('Team height in the hierarchy. Example: 0'),
    depth: z.number().nullable().describe('Team depth in the hierarchy. Example: 0')
});

const action = createAction({
    description: 'Create a new team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/teams',
            data: {
                team: {
                    name: input.name
                }
            },
            retries: 3
        });

        const providerTeam = ProviderTeamSchema.parse(response.data);

        return {
            id: providerTeam.id,
            account_id: providerTeam.account_id,
            name: providerTeam.name,
            parent_id: providerTeam.parent_id,
            created_at: providerTeam.created_at,
            updated_at: providerTeam.updated_at,
            permissions: providerTeam.permissions,
            height: providerTeam.height,
            depth: providerTeam.depth
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
