import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.number().describe('The numeric ID of the team to retrieve.')
});

const TeamOutputSchema = z.object({
    id: z.number().describe('The unique numeric identifier of the team.'),
    parentId: z.number().optional().describe('The ID of the parent organization, if this team belongs to one.'),
    name: z.string().describe('The display name of the team.'),
    slug: z.string().optional().describe('The URL-friendly slug of the team.'),
    logoUrl: z.string().optional().describe("The URL of the team's logo image."),
    calVideoLogo: z.string().optional().describe('The URL of the Cal Video logo for the team.'),
    appLogo: z.string().optional().describe('The URL of the app logo for the team.'),
    appIconLogo: z.string().optional().describe('The URL of the app icon logo for the team.'),
    bio: z.string().optional().describe('The biography or description of the team.'),
    hideBranding: z.boolean().optional().describe('Whether to hide Cal.com branding on booking pages.'),
    isOrganization: z.boolean().describe('Whether this resource is an organization rather than a regular team.'),
    isPrivate: z.boolean().optional().describe('Whether the team is private.'),
    hideBookATeamMember: z.boolean().optional().describe('Whether to hide the "Book a team member" option.'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Arbitrary metadata stored on the team.'),
    theme: z.string().optional().describe('The visual theme of the team.'),
    brandColor: z.string().optional().describe('The brand color of the team.'),
    darkBrandColor: z.string().optional().describe('The brand color used in dark mode.'),
    bannerUrl: z.string().optional().describe('The URL of the banner image shown on the booking page.'),
    timeFormat: z.number().optional().describe('The preferred time format (12 or 24 hour).'),
    timeZone: z.string().optional().describe("The time zone used for the team's default schedule."),
    weekStart: z.string().optional().describe('The day the week starts on (e.g., Sunday or Monday).')
});

const GetTeamResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: TeamOutputSchema
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single team from Cal.com by ID without modifying any data.
 * @pitfalls: Non-existent team IDs and teams the caller is not a member of both return 403 Forbidden, so callers cannot distinguish between a missing resource and an access-denied one.
 */
const action = createAction({
    description: 'Retrieve a single team from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: TeamOutputSchema,
    scopes: ['TEAM_PROFILE_READ'],

    exec: async (nango, input): Promise<z.infer<typeof TeamOutputSchema>> => {
        // https://cal.com/docs/api-reference/v2/teams/get-a-team
        const response = await nango.get({
            endpoint: `/teams/${encodeURIComponent(input.teamId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Team ${input.teamId} not found.`
            });
        }

        const parsed = GetTeamResponseSchema.parse(response.data);

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
