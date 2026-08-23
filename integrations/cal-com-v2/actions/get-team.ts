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

const ProviderTeamSchema = z.object({
    id: z.number(),
    parentId: z.number().nullish(),
    name: z.string(),
    slug: z.string().nullish(),
    logoUrl: z.string().nullish(),
    calVideoLogo: z.string().nullish(),
    appLogo: z.string().nullish(),
    appIconLogo: z.string().nullish(),
    bio: z.string().nullish(),
    hideBranding: z.boolean().nullish(),
    isOrganization: z.boolean(),
    isPrivate: z.boolean().nullish(),
    hideBookATeamMember: z.boolean().nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
    theme: z.string().nullish(),
    brandColor: z.string().nullish(),
    darkBrandColor: z.string().nullish(),
    bannerUrl: z.string().nullish(),
    timeFormat: z.number().nullish(),
    timeZone: z.string().nullish(),
    weekStart: z.string().nullish()
});

const ResponseEnvelopeSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.unknown().optional()
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
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Cal.com returns 403 for
        // both non-existent and inaccessible teams, which we convert into a not_found error.
        try {
            response = await nango.get({
                // https://cal.com/docs/api-reference/v2/teams/get-a-team
                endpoint: `/teams/${encodeURIComponent(input.teamId)}`,
                retries: 3
            });
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const errResponse = err.response;
                if (
                    typeof errResponse === 'object' &&
                    errResponse !== null &&
                    'status' in errResponse &&
                    (errResponse.status === 404 || errResponse.status === 403)
                ) {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: `Team ${input.teamId} not found.`
                    });
                }
            }
            throw err;
        }

        const envelope = ResponseEnvelopeSchema.parse(response.data);

        if (envelope.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when retrieving the team.'
            });
        }

        const team = ProviderTeamSchema.parse(envelope.data);

        return {
            id: team.id,
            ...(team.parentId != null && { parentId: team.parentId }),
            name: team.name,
            ...(team.slug != null && { slug: team.slug }),
            ...(team.logoUrl != null && { logoUrl: team.logoUrl }),
            ...(team.calVideoLogo != null && { calVideoLogo: team.calVideoLogo }),
            ...(team.appLogo != null && { appLogo: team.appLogo }),
            ...(team.appIconLogo != null && { appIconLogo: team.appIconLogo }),
            ...(team.bio != null && { bio: team.bio }),
            ...(team.hideBranding != null && { hideBranding: team.hideBranding }),
            isOrganization: team.isOrganization,
            ...(team.isPrivate != null && { isPrivate: team.isPrivate }),
            ...(team.hideBookATeamMember != null && { hideBookATeamMember: team.hideBookATeamMember }),
            ...(team.metadata != null && { metadata: team.metadata }),
            ...(team.theme != null && { theme: team.theme }),
            ...(team.brandColor != null && { brandColor: team.brandColor }),
            ...(team.darkBrandColor != null && { darkBrandColor: team.darkBrandColor }),
            ...(team.bannerUrl != null && { bannerUrl: team.bannerUrl }),
            ...(team.timeFormat != null && { timeFormat: team.timeFormat }),
            ...(team.timeZone != null && { timeZone: team.timeZone }),
            ...(team.weekStart != null && { weekStart: team.weekStart })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
