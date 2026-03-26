import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    // No input required for team.info
});

const TeamIconSchema = z.object({
    image_default: z.boolean().optional(),
    image_34: z.string().optional(),
    image_44: z.string().optional(),
    image_68: z.string().optional(),
    image_88: z.string().optional(),
    image_102: z.string().optional(),
    image_132: z.string().optional(),
    image_230: z.string().optional(),
    image_original: z.string().optional()
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    domain: z.string(),
    email_domain: z.string().optional(),
    icon: TeamIconSchema.optional()
});

const OutputSchema = z.object({
    team: TeamSchema
});

const action = createAction({
    description: 'Retrieve workspace details such as name, domain, and icon',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-team-info',
        group: 'Team'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['team:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/team.info
        const response = await nango.get({
            endpoint: 'team.info',
            retries: 3
        });

        if (!response.data?.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to retrieve team info'
            });
        }

        const team = response.data.team;

        return {
            team: {
                id: team.id,
                name: team.name,
                domain: team.domain,
                email_domain: team.email_domain ?? undefined,
                icon: team.icon
                    ? {
                          image_default: team.icon.image_default ?? undefined,
                          image_34: team.icon.image_34 ?? undefined,
                          image_44: team.icon.image_44 ?? undefined,
                          image_68: team.icon.image_68 ?? undefined,
                          image_88: team.icon.image_88 ?? undefined,
                          image_102: team.icon.image_102 ?? undefined,
                          image_132: team.icon.image_132 ?? undefined,
                          image_230: team.icon.image_230 ?? undefined,
                          image_original: team.icon.image_original ?? undefined
                      }
                    : undefined
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
