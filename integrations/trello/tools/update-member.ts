import { z } from 'zod';
import { createTool } from 'nango';

const SummaryFrequencySchema = z.enum(['disabled', 'every-minute', 'hourly']);

const InputSchema = z
    .object({
        bio: z.string().optional().describe('Replacement Unicode biography; empty string clears the biography.'),
        locale: z.string().min(1).optional().describe('Replacement Trello locale identifier, such as en-AU.'),
        fullName: z
            .string()
            .min(1)
            .regex(/^\S(?:[\s\S]*\S)?$/)
            .optional()
            .describe('Replacement display name; no leading or trailing whitespace.'),
        initials: z.string().min(1).max(4).optional().describe('Replacement initials, one to four characters.'),
        memberId: z.string().min(1).describe('ID or current username of the member to modify.'),
        username: z
            .string()
            .min(3)
            .regex(/^[a-z0-9_]+$/)
            .optional()
            .describe('Unique replacement username using lowercase letters, digits, and underscores.'),
        colorBlind: z.boolean().optional().describe('Enable or disable color-blind-friendly presentation.'),
        avatarSource: z
            .enum(['gravatar', 'none', 'upload'])
            .optional()
            .describe('Avatar source to activate; none disables the visible avatar, upload selects an uploaded image.'),
        summaryFrequency: SummaryFrequencySchema.optional().describe('Email summary interval: disabled, one minute, or sixty minutes.')
    })
    .refine((input) => Object.keys(input).length >= 2, {
        message: 'At least one field to update must be supplied alongside memberId.'
    })
    .meta({ minProperties: 2 })
    .describe('Partial member update: the member to modify plus only the fields to change. Omitted fields are left unchanged.');

const OutputSchema = z
    .object({
        id: z.string().describe('Opaque ID of the updated member.'),
        bio: z.string().optional().describe('Biography returned after the change, including empty text.'),
        locale: z.string().optional().describe('Returned locale identifier.'),
        fullName: z.string().optional().describe('Display name returned after the change.'),
        initials: z.string().optional().describe('Initials returned after the change.'),
        username: z.string().optional().describe('Username returned after the change; absent if not returned.'),
        colorBlind: z.boolean().optional().describe('Returned color-blind presentation setting.'),
        avatarSource: z.string().optional().describe('Avatar source returned after the change.'),
        summaryFrequency: SummaryFrequencySchema.optional().describe('Returned summary interval when it is one of the supported choices.')
    })
    .describe('The member state returned by Trello after the update.');

const ProviderMemberSchema = z.object({
    id: z.string(),
    bio: z.string().nullable().optional(),
    fullName: z.string().nullable().optional(),
    initials: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    avatarSource: z.string().nullable().optional(),
    prefs: z
        .object({
            colorBlind: z.boolean().nullable().optional(),
            locale: z.string().nullable().optional(),
            minutesBetweenSummaries: z.number().int().nullable().optional()
        })
        .nullable()
        .optional()
});

const ProxyErrorSchema = z.object({
    response: z
        .object({
            status: z.number(),
            data: z.unknown().optional()
        })
        .optional()
});

const SUMMARY_FREQUENCY_MINUTES: Record<'disabled' | 'every-minute' | 'hourly', number> = {
    disabled: -1,
    'every-minute': 1,
    hourly: 60
};

function providerErrorMessage(data: unknown): string | undefined {
    if (typeof data === 'string' && data.length > 0) {
        return data;
    }
    const parsed = z.object({ message: z.string() }).safeParse(data);
    return parsed.success ? parsed.data.message : undefined;
}

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates a Trello member's profile and preferences; supplied values overwrite existing data and an empty biography clears it.
 * @pitfalls: The connection can only change fields its account may edit; Trello rejects an already-taken username, an unsupported locale, or avatarSource upload without an uploaded image. After a username change the old username no longer resolves the member, so follow-up calls must use the member ID or new username.
 */
const tool = createTool({
    name: 'update-member',
    description: "Partially update a member's editable profile and personal preferences, subject to the connection's authority.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use `get-member` first if you need current values. Omitted fields are unchanged. An empty biography clears it; other editable text fields must be nonempty. Upload an image with `upload-member-avatar`; avatarSource selects which available avatar to use.',
        requiredScopes: ['write:member:trello'],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },

    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const params: Record<string, string | number> = {};
        if (input.fullName !== undefined) {
            params['fullName'] = input.fullName;
        }
        if (input.initials !== undefined) {
            params['initials'] = input.initials;
        }
        if (input.username !== undefined) {
            params['username'] = input.username;
        }
        if (input.bio !== undefined) {
            params['bio'] = input.bio;
        }
        if (input.avatarSource !== undefined) {
            params['avatarSource'] = input.avatarSource;
        }
        if (input.colorBlind !== undefined) {
            params['prefs/colorBlind'] = input.colorBlind ? 'true' : 'false';
        }
        if (input.summaryFrequency !== undefined) {
            params['prefs/minutesBetweenSummaries'] = SUMMARY_FREQUENCY_MINUTES[input.summaryFrequency];
        }

        let responseData: unknown;
        // @allowTryCatch: Trello failure statuses must be translated into the tool's public error codes.
        try {
            // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-id-put
            const response = await nango.put({
                endpoint: `/members/${encodeURIComponent(input.memberId)}`,
                params,
                // Not naturally idempotent: a retry after a lost response could repeat a profile or username mutation.
                retries: 0
            });
            responseData = response.data;
        } catch (error) {
            const parsedError = ProxyErrorSchema.safeParse(error);
            const status = parsedError.success ? parsedError.data.response?.status : undefined;
            const providerMessage = parsedError.success ? providerErrorMessage(parsedError.data.response?.data) : undefined;
            if (status === 404) {
                throw new Error(`not_found: The member no longer resolves.${providerMessage ? ` ${providerMessage}` : ''}`);
            }
            if (status === 401 || status === 403) {
                throw new Error(
                    `permission_denied: The connection lacks write authority for this member or the required scope.${providerMessage ? ` ${providerMessage}` : ''}`
                );
            }
            if (
                status === 409 ||
                (status === 400 &&
                    providerMessage !== undefined &&
                    /username/i.test(providerMessage) &&
                    /taken|in use|already|unavailable/i.test(providerMessage))
            ) {
                throw new Error(`conflict: The requested username is already in use.${providerMessage ? ` ${providerMessage}` : ''}`);
            }
            if (status === 400) {
                throw new Error(`invalid_value: Trello rejected a supplied value.${providerMessage ? ` ${providerMessage}` : ''}`);
            }
            throw error;
        }

        const member = ProviderMemberSchema.safeParse(responseData);
        if (!member.success) {
            throw new Error(
                'write_result_unknown: Trello accepted the update but its response could not be mapped; inspect the member with get-member before repeating the update.'
            );
        }

        const updated = member.data;
        const result: z.infer<typeof OutputSchema> = { id: updated.id };
        if (updated.bio !== undefined && updated.bio !== null) {
            result.bio = updated.bio;
        }
        if (updated.fullName !== undefined && updated.fullName !== null) {
            result.fullName = updated.fullName;
        }
        if (updated.initials !== undefined && updated.initials !== null) {
            result.initials = updated.initials;
        }
        if (updated.username !== undefined && updated.username !== null) {
            result.username = updated.username;
        }
        if (updated.avatarSource !== undefined && updated.avatarSource !== null) {
            result.avatarSource = updated.avatarSource;
        }
        if (updated.prefs?.colorBlind !== undefined && updated.prefs.colorBlind !== null) {
            result.colorBlind = updated.prefs.colorBlind;
        }
        if (updated.prefs?.locale !== undefined && updated.prefs.locale !== null) {
            result.locale = updated.prefs.locale;
        }
        const minutesBetweenSummaries = updated.prefs?.minutesBetweenSummaries;
        if (minutesBetweenSummaries === -1) {
            result.summaryFrequency = 'disabled';
        } else if (minutesBetweenSummaries === 1) {
            result.summaryFrequency = 'every-minute';
        } else if (minutesBetweenSummaries === 60) {
            result.summaryFrequency = 'hourly';
        }

        return result;
    }
});

export default tool;
