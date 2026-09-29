import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const TeamSchema = z.object({
    id: z.string().describe('Sentry team ID. Example: "4512170111401984"'),
    name: z.string().describe('Team display name. Example: "Nango Seed Team"'),
    slug: z.string().describe('URL-friendly team slug. Example: "nango-seed-team"')
});

const ProjectSchema = z.object({
    id: z.string().describe('Sentry project ID. Example: "4512170111991808"'),
    slug: z.string().describe('URL-friendly project slug. Example: "nango-seed-project"'),
    name: z.string().describe('Project display name. Example: "Nango Seed Project"'),
    platform: z.string().optional().describe('Project platform key. Omitted when no platform is set. Example: "node"'),
    dateCreated: z.string().describe('ISO 8601 creation timestamp. Example: "2026-09-29T12:00:00.000Z"'),
    isBookmarked: z.boolean().describe('Whether the project is bookmarked by the authenticated user.'),
    isMember: z.boolean().describe('Whether the authenticated user is a member of the project.'),
    firstEvent: z.string().optional().describe('ISO 8601 timestamp of the first event received by the project. Omitted when no event has been received yet.'),
    environments: z.array(z.string()).describe('Names of environments the project has seen. Example: ["production"]'),
    team: TeamSchema.optional().describe('Primary team that owns the project. Omitted when the project has no team.'),
    teams: z.array(TeamSchema).describe('All teams associated with the project.')
});

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the Sentry organization to list projects for. Example: "nangodev"'),
        cursor: z
            .string()
            .regex(/^[\w:.-]+$/)
            .optional()
            .describe('Opaque pagination cursor returned as nextCursor by a previous call. Omit for the first page.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of projects to return per page. Sentry default and maximum is 100.'),
        query: z.string().optional().describe('Optional filter on project name or slug. Example: "seed"')
    })
    .describe('Input for listing Sentry organization projects.');

const OutputSchema = z
    .object({
        projects: z.array(ProjectSchema).describe('Projects in the organization for the requested page.'),
        nextCursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page. Omitted when there are no more results.')
    })
    .describe('One page of Sentry organization projects.');

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string()
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    platform: z.string().nullable(),
    dateCreated: z.string(),
    isBookmarked: z.boolean(),
    isMember: z.boolean(),
    firstEvent: z.string().nullable(),
    environments: z.array(z.string()),
    team: ProviderTeamSchema.nullable(),
    teams: z.array(ProviderTeamSchema)
});

function parseNextCursor(linkHeader: string): string | undefined {
    const nextPart = linkHeader
        .split(',')
        .map((part) => part.trim())
        .find((part) => /rel="next"/.test(part));
    if (!nextPart || /results="false"/.test(nextPart)) {
        return undefined;
    }
    const cursorAttr = nextPart.match(/cursor="([^"]+)"/);
    if (cursorAttr && cursorAttr[1]) {
        return cursorAttr[1];
    }
    const urlCursor = nextPart.match(/[?&]cursor=([^>&]+)/);
    if (urlCursor && urlCursor[1]) {
        return urlCursor[1];
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Performs only a read-only GET request to list the organization's projects; it never mutates provider state.
 */
const action = createAction({
    description: 'List all projects in a Sentry organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/organizations/list-an-organizations-projects/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/projects/`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.query !== undefined && { query: input.query })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = z.array(ProviderProjectSchema).parse(response.data);

        const projects: z.infer<typeof ProjectSchema>[] = parsed.map((project) => ({
            id: project.id,
            slug: project.slug,
            name: project.name,
            ...(project.platform != null && { platform: project.platform }),
            dateCreated: project.dateCreated,
            isBookmarked: project.isBookmarked,
            isMember: project.isMember,
            ...(project.firstEvent != null && { firstEvent: project.firstEvent }),
            environments: project.environments,
            ...(project.team != null && { team: project.team }),
            teams: project.teams
        }));

        const linkHeader = response.headers['link'];
        const nextCursor = typeof linkHeader === 'string' ? parseNextCursor(linkHeader) : undefined;

        return {
            projects,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
