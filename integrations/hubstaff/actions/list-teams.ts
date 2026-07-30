import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.number().describe('Organization ID. Example: 775646')
});

const TeamSchema = z
    .object({
        id: z.number(),
        name: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    teams: z.array(TeamSchema)
});

const WrappedTeamsSchema = z.object({
    teams: z.array(z.unknown())
});

const action = createAction({
    description: 'List teams within an organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.hubstaff.com/
            endpoint: `v2/organizations/${encodeURIComponent(String(input.organization_id))}/teams`,
            retries: 3
        });

        const wrapped = WrappedTeamsSchema.safeParse(response.data);
        if (wrapped.success) {
            return {
                teams: wrapped.data.teams.map((item) => TeamSchema.parse(item))
            };
        }

        const directArray = z.array(z.unknown()).safeParse(response.data);
        if (directArray.success) {
            return {
                teams: directArray.data.map((item) => TeamSchema.parse(item))
            };
        }

        throw new nango.ActionError({
            type: 'invalid_response',
            message: 'Unexpected response format from Hubstaff API.'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
