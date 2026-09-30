import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or URL slug of the organization the project belongs to. Example: "nangodev".'),
        project_id_or_slug: z
            .string()
            .describe(
                'The ID or URL slug of the project to unassign the team from. Project slugs are unique within an organization. Example: "the-spoiled-yoghurt".'
            ),
        team_id_or_slug: z.string().describe('The ID or URL slug of the team to remove from the project. Example: "prime-mover".')
    })
    .describe('Identifies the project and the team to unassign from it.');

const TeamSchema = z.object({
    id: z.string().describe('The numeric ID of the team. Example: "2349234102".'),
    slug: z.string().describe('The URL slug of the team. Example: "prime-mover".'),
    name: z.string().describe('The display name of the team. Example: "Prime Mover".')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The numeric ID of the project the team was removed from. Example: "6758470122493650".'),
        slug: z.string().describe('The URL slug of the project the team was removed from. Example: "the-spoiled-yoghurt".'),
        name: z.string().describe('The display name of the project the team was removed from. Example: "The Spoiled Yoghurt".'),
        teams: z.array(TeamSchema).describe('The teams still assigned to the project after the removal. Empty when the removed team was the last one.')
    })
    .describe('The project after the team was removed from it.');

const ProjectResponseSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    teams: z.array(
        z.object({
            id: z.string(),
            slug: z.string(),
            name: z.string()
        })
    )
});

/**
 * @tags: [write, destructive]
 * @tagReason: Sends a DELETE to the provider that revokes the team's access to the project; restoring access requires a separate add-team-to-project call.
 * @pitfalls: Returns 404 if the project or team does not exist or the team is not currently assigned to the project, so repeating a removal fails instead of succeeding as a no-op. Team admins can only revoke access for teams they administrate.
 */
const action = createAction({
    description: 'Unassign a team from a project, revoking its access',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/projects/delete-a-team-from-a-project/
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/projects/delete-a-team-from-a-project/
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/teams/${encodeURIComponent(input.team_id_or_slug)}/`,
            // DELETE is idempotent here: removing an already-removed team leaves the same end state, so retries are safe.
            retries: 3
        };

        const response = await nango.delete(config);
        const project = ProjectResponseSchema.parse(response.data);

        return {
            id: project.id,
            slug: project.slug,
            name: project.name,
            teams: project.teams
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
