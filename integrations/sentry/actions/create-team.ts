import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the team belongs to. Example: "nangodev"'),
        slug: z
            .string()
            .optional()
            .describe(
                'Uniquely identifies the team and is used in the Sentry interface. If omitted, it is automatically generated from the name. Example: "ancient-gabelers"'
            ),
        name: z
            .string()
            .optional()
            .describe(
                'Deprecated by Sentry. The display name for the team. If omitted, it is automatically generated from the slug. Example: "Ancient Gabelers"'
            )
    })
    .describe('Input for creating a new Sentry team. At least one of slug or name must be provided.');

const OutputSchema = z
    .object({
        id: z.string().describe('The numeric ID of the created team. Example: "4502349234123"'),
        slug: z.string().describe('The slug of the created team, used in the Sentry interface. Example: "ancient-gabelers"'),
        name: z.string().describe('The display name of the created team. Example: "Ancient Gabelers"'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the team was created. Example: "2021-06-12T23:38:54.168307Z"'),
        isMember: z.boolean().describe('Whether the user the API token belongs to is a member of the created team.'),
        teamRole: z.string().optional().describe('The role of the token\'s user on the created team. Example: "admin"'),
        memberCount: z.number().optional().describe('The number of members on the created team. Example: 1')
    })
    .describe('The newly created Sentry team.');

const SentryTeamSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    dateCreated: z.string(),
    isMember: z.boolean(),
    teamRole: z.string().nullable().optional(),
    memberCount: z.number().optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new team in the Sentry organization, which is a provider-side mutation.
 * @pitfalls: Requires one of the team:write, org:write, or org:admin token scopes. The slug must be unique within the organization or creation fails. If only name is provided the slug is auto-generated from it, and if only slug is provided the display name is derived from it (name is deprecated by Sentry). The API token's user is automatically added to the new team as an admin, so it already has one member at creation.
 */
const action = createAction({
    description: 'Create a new team in a Sentry organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['team:write', 'org:write', 'org:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.slug === undefined && input.name === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of slug or name must be provided to create a team.'
            });
        }

        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/teams/create-a-new-team/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/teams/`,
            data: {
                ...(input.slug !== undefined && { slug: input.slug }),
                ...(input.name !== undefined && { name: input.name })
            },
            // Creating a team is not idempotent: a retry after a lost response could create a duplicate team, so no retries.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- 0 is deliberate here; the autofix would wrongly raise it for this non-idempotent create.
            retries: 0
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Sentry returned an empty response when creating the team.'
            });
        }

        const team = SentryTeamSchema.parse(response.data);

        return {
            id: team.id,
            slug: team.slug,
            name: team.name,
            dateCreated: team.dateCreated,
            isMember: team.isMember,
            ...(team.teamRole != null && { teamRole: team.teamRole }),
            ...(team.memberCount !== undefined && { memberCount: team.memberCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
