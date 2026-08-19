import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required for listing teams.');

const ProviderTeamSchema = z.object({
    id: z.number(),
    parentId: z.number().optional(),
    name: z.string(),
    slug: z.string().optional(),
    logoUrl: z.string().optional(),
    calVideoLogo: z.string().optional(),
    appLogo: z.string().optional(),
    appIconLogo: z.string().optional(),
    bio: z.string().optional(),
    hideBranding: z.boolean().optional(),
    isOrganization: z.boolean(),
    isPrivate: z.boolean().optional(),
    hideBookATeamMember: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    theme: z.string().optional(),
    brandColor: z.string().optional(),
    darkBrandColor: z.string().optional(),
    bannerUrl: z.string().optional(),
    timeFormat: z.number().optional(),
    timeZone: z.string().optional(),
    weekStart: z.string().optional()
});

const TeamSchema = z.object({
    id: z.number().describe('Unique identifier of the team.'),
    parentId: z.number().optional().describe('Parent team or organization identifier, if any.'),
    name: z.string().describe('Display name of the team.'),
    slug: z.string().optional().describe('URL-friendly identifier for the team.'),
    logoUrl: z.string().optional().describe('URL of the team logo image.'),
    calVideoLogo: z.string().optional().describe('URL of the Cal Video logo for the team.'),
    appLogo: z.string().optional().describe('URL of the application logo for the team.'),
    appIconLogo: z.string().optional().describe('URL of the application icon logo for the team.'),
    bio: z.string().optional().describe('Biography or description of the team.'),
    hideBranding: z.boolean().optional().describe('Whether to hide Cal.com branding on booking pages.'),
    isOrganization: z.boolean().describe('Whether this team represents an organization.'),
    isPrivate: z.boolean().optional().describe('Whether the team is private.'),
    hideBookATeamMember: z.boolean().optional().describe('Whether to hide the "Book a team member" option.'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Arbitrary metadata key-value pairs associated with the team.'),
    theme: z.string().optional().describe('UI theme identifier for the team.'),
    brandColor: z.string().optional().describe('Primary brand color for the team.'),
    darkBrandColor: z.string().optional().describe('Brand color used in dark mode.'),
    bannerUrl: z.string().optional().describe('URL of the team banner image.'),
    timeFormat: z.number().optional().describe('Preferred time format (12 or 24 hour).'),
    timeZone: z.string().optional().describe('Default time zone for the team. Example: "Europe/London".'),
    weekStart: z.string().optional().describe('Day the week starts on. Example: "Sunday".')
});

const OutputSchema = z
    .object({
        teams: z.array(TeamSchema).describe('List of teams accessible to the authenticated user.')
    })
    .describe('Output containing the list of teams from Cal.com.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a list of teams accessible to the authenticated user without modifying any data.
 * @pitfalls: Organization accounts cannot use team endpoints per Cal.com's API model and must use organization-specific endpoints to list teams.
 */
const action = createAction({
    description: 'List teams from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['TEAM_PROFILE_READ'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://cal.com/docs/api-reference/v2/teams/get-teams
        const response = await nango.get({
            endpoint: '/teams',
            retries: 3
        });

        const parsedResponse = z
            .object({
                status: z.enum(['success', 'error']),
                data: z.array(ProviderTeamSchema)
            })
            .safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Failed to parse Cal.com teams response.',
                details: parsedResponse.error.issues
            });
        }

        if (parsedResponse.data.status === 'error') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status.'
            });
        }

        return {
            teams: parsedResponse.data.data.map((team) => ({
                id: team.id,
                ...(team.parentId !== undefined && { parentId: team.parentId }),
                name: team.name,
                ...(team.slug !== undefined && { slug: team.slug }),
                ...(team.logoUrl !== undefined && { logoUrl: team.logoUrl }),
                ...(team.calVideoLogo !== undefined && { calVideoLogo: team.calVideoLogo }),
                ...(team.appLogo !== undefined && { appLogo: team.appLogo }),
                ...(team.appIconLogo !== undefined && { appIconLogo: team.appIconLogo }),
                ...(team.bio !== undefined && { bio: team.bio }),
                ...(team.hideBranding !== undefined && { hideBranding: team.hideBranding }),
                isOrganization: team.isOrganization,
                ...(team.isPrivate !== undefined && { isPrivate: team.isPrivate }),
                ...(team.hideBookATeamMember !== undefined && { hideBookATeamMember: team.hideBookATeamMember }),
                ...(team.metadata !== undefined && { metadata: team.metadata }),
                ...(team.theme !== undefined && { theme: team.theme }),
                ...(team.brandColor !== undefined && { brandColor: team.brandColor }),
                ...(team.darkBrandColor !== undefined && { darkBrandColor: team.darkBrandColor }),
                ...(team.bannerUrl !== undefined && { bannerUrl: team.bannerUrl }),
                ...(team.timeFormat !== undefined && { timeFormat: team.timeFormat }),
                ...(team.timeZone !== undefined && { timeZone: team.timeZone }),
                ...(team.weekStart !== undefined && { weekStart: team.weekStart })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
