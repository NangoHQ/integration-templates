import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const TeamSchema = z
    .object({
        id: z.string().describe('Team ID. Example: "4512170111401984"'),
        name: z.string().describe('Team display name. Example: "Nango Seed Team"'),
        slug: z.string().describe('URL-friendly team slug, unique within the organization. Example: "nango-seed-team"')
    })
    .describe('A team assigned to the project');

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization that owns the project. Example: "nangodev"'),
        project_id_or_slug: z
            .string()
            .describe('ID or slug of the project to assign the team to. Project slugs are unique within the organization. Example: "nango-seed-project"'),
        team_id_or_slug: z.string().describe('ID or slug of the team to assign to the project. Example: "nango-seed-team"')
    })
    .describe('Identifies the project and the team to assign to it');

const OutputSchema = z
    .object({
        id: z.string().describe('Project ID. Example: "4512170111991808"'),
        slug: z.string().describe('URL-friendly project slug, unique within the organization. Example: "nango-seed-project"'),
        name: z.string().describe('Project display name. Example: "Nango Seed Project"'),
        platform: z.string().optional().describe('Project platform key. Omitted when the project has no platform set. Example: "node"'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the project was created. Example: "2026-09-29T12:00:00.000000Z"'),
        isBookmarked: z.boolean().describe('Whether the project is bookmarked by the acting user'),
        isMember: z.boolean().describe('Whether the acting user belongs to a team assigned to the project'),
        firstEvent: z.string().optional().describe('ISO 8601 timestamp of the first event received by the project. Omitted when no event has been received'),
        firstTransactionEvent: z.boolean().describe('Whether the project has received a transaction event'),
        access: z.array(z.string()).describe('Scopes available to the acting user on this project. Example: ["project:read", "project:write"]'),
        hasAccess: z.boolean().describe('Whether the acting user has access to the project'),
        color: z.string().describe('Project accent color as a hex code. Example: "#5cbf3f"'),
        status: z.string().describe('Project status. Example: "active"'),
        team: TeamSchema.optional().describe('Primary team of the project. Omitted when none is set'),
        teams: z.array(TeamSchema).describe('All teams assigned to the project, including the team just added')
    })
    .describe('The updated project with its full list of assigned teams');

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string()
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    platform: z.string().nullable().optional(),
    dateCreated: z.string(),
    isBookmarked: z.boolean(),
    isMember: z.boolean(),
    firstEvent: z.string().nullable().optional(),
    firstTransactionEvent: z.boolean(),
    access: z.array(z.string()),
    hasAccess: z.boolean(),
    color: z.string(),
    status: z.string(),
    team: ProviderTeamSchema.nullable().optional(),
    teams: z.array(ProviderTeamSchema)
});

/**
 * @tags: [write]
 * @tagReason: Assigns a team to a project, mutating the project's team memberships in Sentry.
 * @pitfalls: Re-adding an already-assigned team succeeds without error and returns the project unchanged. The token needs project:write or project:admin scope. The returned access list reflects the acting user's organization role rather than the token's granted scopes, so it may list permissions the token cannot actually use.
 */
const action = createAction({
    description: 'Assign an additional team to a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:write', 'project:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/projects/add-a-team-to-a-project/
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/teams/${encodeURIComponent(
                input.team_id_or_slug
            )}/`,
            // Naturally idempotent: Sentry deduplicates the project-team association, so repeating this POST has no additional effect.
            retries: 3
        };
        const response = await nango.post(config);

        const project = ProviderProjectSchema.parse(response.data);

        return {
            id: project.id,
            slug: project.slug,
            name: project.name,
            ...(project.platform != null && { platform: project.platform }),
            dateCreated: project.dateCreated,
            isBookmarked: project.isBookmarked,
            isMember: project.isMember,
            ...(project.firstEvent != null && { firstEvent: project.firstEvent }),
            firstTransactionEvent: project.firstTransactionEvent,
            access: project.access,
            hasAccess: project.hasAccess,
            color: project.color,
            status: project.status,
            ...(project.team != null && { team: project.team }),
            teams: project.teams
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
