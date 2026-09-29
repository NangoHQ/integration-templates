import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the project belongs to. Example: "nangodev"'),
        team_id_or_slug: z.string().describe('The ID or slug of the team the new project is bound to. Example: "nango-seed-team"'),
        name: z.string().describe('The name for the project. Example: "My Web App"'),
        slug: z
            .string()
            .optional()
            .describe('Unique slug identifying the project, used in the Sentry interface. If omitted, it is generated from the name. Example: "my-web-app"'),
        platform: z.string().optional().describe('The platform for the project. Example: "node"'),
        default_rules: z
            .boolean()
            .optional()
            .describe('Whether to create a default alert rule that notifies on every new issue. Defaults to true; set to false to manage alerts manually.')
    })
    .describe('Input for creating a Sentry project bound to a team');

const ProjectTeamSchema = z
    .object({
        id: z.string().describe('Numeric ID of the team. Example: "4512170111401984"'),
        name: z.string().describe('Name of the team. Example: "Nango Seed Team"'),
        slug: z.string().describe('Slug of the team. Example: "nango-seed-team"')
    })
    .describe('A team associated with the project');

const OutputSchema = z
    .object({
        id: z.string().describe('Numeric ID of the created project. Example: "4512170111991808"'),
        slug: z.string().describe('Slug of the created project. Example: "nango-seed-project"'),
        name: z.string().describe('Name of the created project. Example: "Nango Seed Project"'),
        platform: z.string().optional().describe('The platform for the project, if one was set. Example: "node"'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the project was created. Example: "2026-09-29T15:25:21.344565Z"'),
        isBookmarked: z.boolean().describe('Whether the project is bookmarked by the acting user'),
        isMember: z.boolean().describe('Whether the acting user is a member of the project'),
        hasAccess: z.boolean().describe('Whether the acting user has access to the project'),
        team: ProjectTeamSchema.optional().describe('The primary team the project is bound to'),
        teams: z.array(ProjectTeamSchema).describe('All teams associated with the project'),
        environments: z.array(z.string()).describe('Environments the project has received events for'),
        features: z.array(z.string()).describe('Feature flags enabled on the project')
    })
    .describe('The newly created Sentry project');

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
    hasAccess: z.boolean(),
    team: ProviderTeamSchema.nullable().optional(),
    teams: z.array(ProviderTeamSchema).optional(),
    environments: z.array(z.string()).optional(),
    features: z.array(z.string()).optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new project under a team via POST; performs no reads or deletes.
 * @pitfalls: Requires project:write or project:admin scope, and if the organization has disabled member project creation it also requires org:write or Team Admin on the team. A slug that is already taken returns 409. A default project key (DSN) is auto-provisioned with the project, and unless default_rules is set to false Sentry also creates a default alert rule that notifies on every new issue.
 */
const action = createAction({
    description: 'Create a new project bound to a team',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:write', 'project:admin', 'org:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/projects/create-a-new-project/
            endpoint: `/0/teams/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.team_id_or_slug)}/projects/`,
            data: {
                name: input.name,
                ...(input.slug !== undefined && { slug: input.slug }),
                ...(input.platform !== undefined && { platform: input.platform }),
                ...(input.default_rules !== undefined && { default_rules: input.default_rules })
            },
            // Create is not idempotent: retrying after a lost response could create a duplicate project.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create: retries must stay 0
            retries: 0
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
            hasAccess: project.hasAccess,
            ...(project.team != null && { team: project.team }),
            teams: project.teams ?? [],
            environments: project.environments ?? [],
            features: project.features ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
