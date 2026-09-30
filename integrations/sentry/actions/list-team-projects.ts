import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization the team belongs to. Example: "nangodev".'),
        team_id_or_slug: z.string().describe('ID or slug of the team whose projects to list. Example: "nango-seed-team".'),
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Opaque pagination cursor returned as nextCursor by a previous call. Omit for the first page. Example: "100:1:0".')
    })
    .describe('Input for listing the projects owned by a Sentry team.');

const ProjectTeamSchema = z
    .object({
        id: z.string().describe('Numeric ID of the team, as a string. Example: "4512170111401984".'),
        name: z.string().describe('Display name of the team. Example: "Nango Seed Team".'),
        slug: z.string().describe('URL-safe slug of the team. Example: "nango-seed-team".')
    })
    .describe('A team the project belongs to.');

const TeamProjectSchema = z
    .object({
        id: z.string().describe('Numeric ID of the project, as a string. Example: "4512170111991808".'),
        slug: z.string().describe('URL-safe slug of the project. Example: "nango-seed-project".'),
        name: z.string().describe('Display name of the project. Example: "Nango Seed Project".'),
        platform: z.string().optional().describe('Primary SDK platform of the project. Omitted when the project has no platform. Example: "node".'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the project was created. Example: "2026-09-29T15:25:21.344565Z".'),
        isBookmarked: z.boolean().optional().describe('Whether the project is bookmarked by the acting user.'),
        isMember: z.boolean().optional().describe('Whether the acting user belongs to a team that owns the project.'),
        hasAccess: z.boolean().optional().describe('Whether the acting user has access to the project based on their organization role.'),
        environments: z.array(z.string()).optional().describe('Names of environments the project has received events or deploys for. Example: ["production"].'),
        firstEvent: z
            .string()
            .optional()
            .describe('ISO 8601 timestamp of the first event the project received. Omitted when the project has received no events.'),
        teams: z.array(ProjectTeamSchema).optional().describe('All teams the project belongs to.')
    })
    .describe('A Sentry project owned by the team.');

const OutputSchema = z
    .object({
        projects: z.array(TeamProjectSchema).describe('Projects owned by the team for the requested page.'),
        nextCursor: z.string().optional().describe('Opaque cursor to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('A page of projects owned by the team.');

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
    isBookmarked: z.boolean().optional(),
    isMember: z.boolean().optional(),
    hasAccess: z.boolean().optional(),
    environments: z.array(z.string()).optional(),
    firstEvent: z.string().nullable().optional(),
    teams: z.array(ProviderTeamSchema).optional()
});

function parseNextCursor(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string' || linkHeader.length === 0) {
        return undefined;
    }

    for (const part of linkHeader.split(',')) {
        if (!part.includes('rel="next"')) {
            continue;
        }
        if (!/results="true"/.test(part)) {
            return undefined;
        }
        const cursorMatch = /cursor="([^"]+)"/.exec(part);
        return cursorMatch ? cursorMatch[1] : undefined;
    }

    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only fetches the team's projects from Sentry and never modifies provider state.
 * @pitfalls: hasAccess and isMember describe the acting user's organization role and team membership, not the API token's granted scopes, so they can overstate what the token itself is allowed to call.
 */
const action = createAction({
    description: "List a team's projects",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/teams/list-a-teams-projects/
            endpoint: `/0/teams/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.team_id_or_slug)}/projects/`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsedProjects = z.array(ProviderProjectSchema).parse(response.data);

        const projects = parsedProjects.map((project) => ({
            id: project.id,
            slug: project.slug,
            name: project.name,
            ...(project.platform != null && { platform: project.platform }),
            dateCreated: project.dateCreated,
            ...(project.isBookmarked !== undefined && { isBookmarked: project.isBookmarked }),
            ...(project.isMember !== undefined && { isMember: project.isMember }),
            ...(project.hasAccess !== undefined && { hasAccess: project.hasAccess }),
            ...(project.environments !== undefined && { environments: project.environments }),
            ...(project.firstEvent != null && { firstEvent: project.firstEvent }),
            ...(project.teams !== undefined && { teams: project.teams })
        }));

        const nextCursor = parseNextCursor(response.headers['link']);

        return {
            projects,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
