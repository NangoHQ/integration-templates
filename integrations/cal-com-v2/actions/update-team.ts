import { z } from 'zod';
import { createAction } from 'nango';

const TeamMetadataSchema = z
    .record(z.string().max(40), z.union([z.string().max(500), z.number(), z.boolean()]))
    .refine((value) => Object.keys(value).length <= 50, { message: 'metadata supports at most 50 keys' });

const InputSchema = z
    .object({
        teamId: z.number().describe('ID of the team to update.'),
        name: z.string().min(1).max(155).optional().describe('Name of the team. Maximum 155 characters. Cannot contain links or URLs.'),
        slug: z.string().optional().describe('Team slug.'),
        logoUrl: z.string().optional().describe("URL of the team's logo image."),
        calVideoLogo: z.string().optional().describe('Cal video logo URL.'),
        appLogo: z.string().optional().describe('App logo URL.'),
        appIconLogo: z.string().optional().describe('App icon logo URL.'),
        bio: z.string().optional().describe('Team biography or description.'),
        hideBranding: z.boolean().optional().describe('Whether to hide branding.'),
        isPrivate: z.boolean().optional().describe('Whether the team is private.'),
        hideBookATeamMember: z.boolean().optional().describe('Whether to hide the book-a-team-member option.'),
        metadata: TeamMetadataSchema.optional().describe(
            'Additional metadata. Must have at most 50 keys, each up to 40 characters. Values can be strings (up to 500 characters), numbers, or booleans.'
        ),
        theme: z.string().optional().describe('Team theme.'),
        brandColor: z.string().optional().describe('Brand color.'),
        darkBrandColor: z.string().optional().describe('Dark brand color.'),
        bannerUrl: z.string().optional().describe("URL of the team's banner image shown on the booker."),
        timeFormat: z.number().optional().describe('Time format preference.'),
        timeZone: z.string().optional().describe("Timezone used to create the team's default schedule. Defaults to Europe/London if not passed."),
        weekStart: z.string().optional().describe('Day the week starts on. Example: Monday.'),
        bookingLimits: z.string().optional().describe('Booking limits configuration.'),
        includeManagedEventsInLimits: z.boolean().optional().describe('Whether to include managed events in booking limits.')
    })
    .describe('Input for updating a Cal.com team.');

const ProviderTeamOutputSchema = z.object({
    id: z.number().describe('Team ID.'),
    parentId: z.number().nullish().describe('Parent team ID.'),
    name: z.string().describe('Team name.'),
    slug: z.string().nullish().describe('Team slug.'),
    logoUrl: z.string().nullish().describe("URL of the team's logo image."),
    calVideoLogo: z.string().nullish().describe('Cal video logo URL.'),
    appLogo: z.string().nullish().describe('App logo URL.'),
    appIconLogo: z.string().nullish().describe('App icon logo URL.'),
    bio: z.string().nullish().describe('Team biography or description.'),
    hideBranding: z.boolean().nullish().describe('Whether to hide branding.'),
    isOrganization: z.boolean().describe('Whether the team is an organization.'),
    isPrivate: z.boolean().nullish().describe('Whether the team is private.'),
    hideBookATeamMember: z.boolean().nullish().describe('Whether to hide the book-a-team-member option.'),
    metadata: z.record(z.string(), z.unknown()).nullish().describe('Team metadata.'),
    theme: z.string().nullish().describe('Team theme.'),
    brandColor: z.string().nullish().describe('Brand color.'),
    darkBrandColor: z.string().nullish().describe('Dark brand color.'),
    bannerUrl: z.string().nullish().describe("URL of the team's banner image shown on the booker."),
    timeFormat: z.number().nullish().describe('Time format preference.'),
    timeZone: z.string().nullish().describe('Team timezone. Defaults to Europe/London.'),
    weekStart: z.string().nullish().describe('Day the week starts on.'),
    bookingLimits: z.record(z.string(), z.unknown()).nullish().describe('Booking limits configuration.'),
    includeManagedEventsInLimits: z.boolean().nullish().describe('Whether managed events are included in booking limits.')
});

const OutputSchema = z
    .object({
        status: z.enum(['success', 'error']).describe('Response status.'),
        data: ProviderTeamOutputSchema.describe('The updated team data.')
    })
    .describe('Output from updating a Cal.com team.');

const ResponseEnvelopeSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.unknown().optional()
});

/**
 * @tags: [write]
 * @tagReason: Mutates team properties via PATCH /v2/teams/{teamId}.
 * @pitfalls: Newly created teams require payment before the creator gains membership, so updating a team immediately after creation fails with a 403.
 */
const action = createAction({
    description: 'Update a team in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['TEAM_PROFILE_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.slug !== undefined && { slug: input.slug }),
            ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
            ...(input.calVideoLogo !== undefined && { calVideoLogo: input.calVideoLogo }),
            ...(input.appLogo !== undefined && { appLogo: input.appLogo }),
            ...(input.appIconLogo !== undefined && { appIconLogo: input.appIconLogo }),
            ...(input.bio !== undefined && { bio: input.bio }),
            ...(input.hideBranding !== undefined && { hideBranding: input.hideBranding }),
            ...(input.isPrivate !== undefined && { isPrivate: input.isPrivate }),
            ...(input.hideBookATeamMember !== undefined && { hideBookATeamMember: input.hideBookATeamMember }),
            ...(input.metadata !== undefined && { metadata: input.metadata }),
            ...(input.theme !== undefined && { theme: input.theme }),
            ...(input.brandColor !== undefined && { brandColor: input.brandColor }),
            ...(input.darkBrandColor !== undefined && { darkBrandColor: input.darkBrandColor }),
            ...(input.bannerUrl !== undefined && { bannerUrl: input.bannerUrl }),
            ...(input.timeFormat !== undefined && { timeFormat: input.timeFormat }),
            ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
            ...(input.weekStart !== undefined && { weekStart: input.weekStart }),
            ...(input.bookingLimits !== undefined && { bookingLimits: input.bookingLimits }),
            ...(input.includeManagedEventsInLimits !== undefined && { includeManagedEventsInLimits: input.includeManagedEventsInLimits })
        };

        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Cal.com returns an error
        // status (e.g. 403 for inaccessible teams) that we convert into a structured ActionError.
        try {
            response = await nango.patch({
                // https://cal.com/docs/api-reference/v2/teams/update-a-team
                endpoint: `/teams/${encodeURIComponent(input.teamId)}`,
                data,
                retries: 1
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when updating the team.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_response',
                message: 'No response data from the update team endpoint.'
            });
        }

        const envelope = ResponseEnvelopeSchema.parse(response.data);

        if (envelope.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when updating the team.'
            });
        }

        return {
            status: envelope.status,
            data: ProviderTeamOutputSchema.parse(envelope.data)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
