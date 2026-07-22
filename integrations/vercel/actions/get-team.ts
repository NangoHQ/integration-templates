import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('Team ID. Example: "team_abc123"')
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    createdAt: z.number().nullable().optional(),
    updatedAt: z.number().nullable().optional(),
    membersCount: z.number().nullable().optional(),
    billingPeriodStart: z.number().nullable().optional(),
    billingPeriodEnd: z.number().nullable().optional(),
    // The "Get a Team" endpoint has no top-level `plan` field; plan lives under `billing.plan`.
    billing: z
        .object({
            plan: z.string().nullable().optional()
        })
        .passthrough()
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().optional(),
    plan: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://vercel.com/docs/rest-api/reference#get-team
        const response = await nango.get({
            endpoint: `/v2/teams/${encodeURIComponent(input.teamId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Team not found',
                teamId: input.teamId
            });
        }

        const providerTeam = ProviderTeamSchema.parse(response.data);

        return {
            id: providerTeam.id,
            slug: providerTeam.slug,
            name: providerTeam.name,
            ...(providerTeam.description != null && { description: providerTeam.description }),
            ...(providerTeam.billing?.plan != null && { plan: providerTeam.billing.plan })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
