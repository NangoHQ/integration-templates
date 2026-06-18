import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('Gong\'s unique numeric identifier for the user (up to 20 digits). Example: "7254376376091929519"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    emailAddress: z.string(),
    created: z.string(),
    active: z.boolean(),
    emailAliases: z.array(z.string()).nullable().optional(),
    trustedEmailAddress: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    extension: z.string().nullable().optional(),
    personalMeetingUrls: z.array(z.string()).nullable().optional(),
    settings: z
        .object({
            webConferencesRecorded: z.boolean().optional(),
            preventWebConferenceRecording: z.boolean().optional(),
            telephonyCallsImported: z.boolean().optional(),
            emailsImported: z.boolean().optional(),
            preventEmailImport: z.boolean().optional(),
            nonRecordedMeetingsImported: z.boolean().optional(),
            gongConnectEnabled: z.boolean().optional()
        })
        .nullable()
        .optional(),
    managerId: z.string().nullable().optional(),
    meetingConsentPageUrl: z.string().nullable().optional(),
    spokenLanguages: z
        .array(
            z.object({
                language: z.string(),
                primary: z.boolean().optional()
            })
        )
        .nullable()
        .optional()
});

const AxiosErrorSchema = z.object({
    response: z.object({ status: z.number(), data: z.unknown().optional() }).optional(),
    status: z.number().optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string(),
    user: ProviderUserSchema
});

const OutputSchema = z.object({
    id: z.string(),
    emailAddress: z.string(),
    created: z.string(),
    active: z.boolean(),
    emailAliases: z.array(z.string()).optional(),
    trustedEmailAddress: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    title: z.string().optional(),
    phoneNumber: z.string().optional(),
    extension: z.string().optional(),
    personalMeetingUrls: z.array(z.string()).optional(),
    settings: z
        .object({
            webConferencesRecorded: z.boolean().optional(),
            preventWebConferenceRecording: z.boolean().optional(),
            telephonyCallsImported: z.boolean().optional(),
            emailsImported: z.boolean().optional(),
            preventEmailImport: z.boolean().optional(),
            nonRecordedMeetingsImported: z.boolean().optional(),
            gongConnectEnabled: z.boolean().optional()
        })
        .optional(),
    managerId: z.string().optional(),
    meetingConsentPageUrl: z.string().optional(),
    spokenLanguages: z
        .array(
            z.object({
                language: z.string(),
                primary: z.boolean().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a single user from Gong.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch Gong returns 404 for non-existent users; nango.get throws on non-2xx.
        try {
            // https://help.gong.io/apidocs/retrieve-user-v2usersid
            const response = await nango.get({
                endpoint: `/v2/users/${encodeURIComponent(input.userId)}`,
                retries: 3
            });

            const providerResponse = ProviderResponseSchema.parse(response.data);
            const user = providerResponse.user;

            return {
                id: user.id,
                emailAddress: user.emailAddress,
                created: user.created,
                active: user.active,
                ...(user.emailAliases != null && { emailAliases: user.emailAliases }),
                ...(user.trustedEmailAddress != null && { trustedEmailAddress: user.trustedEmailAddress }),
                ...(user.firstName != null && { firstName: user.firstName }),
                ...(user.lastName != null && { lastName: user.lastName }),
                ...(user.title != null && { title: user.title }),
                ...(user.phoneNumber != null && { phoneNumber: user.phoneNumber }),
                ...(user.extension != null && { extension: user.extension }),
                ...(user.personalMeetingUrls != null && { personalMeetingUrls: user.personalMeetingUrls }),
                ...(user.settings != null && { settings: user.settings }),
                ...(user.managerId != null && { managerId: user.managerId }),
                ...(user.meetingConsentPageUrl != null && { meetingConsentPageUrl: user.meetingConsentPageUrl }),
                ...(user.spokenLanguages != null && { spokenLanguages: user.spokenLanguages })
            };
        } catch (err: unknown) {
            const parsedErr = AxiosErrorSchema.safeParse(err);
            const status = parsedErr.success ? (parsedErr.data.response?.status ?? parsedErr.data.status) : undefined;
            if (status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'User not found',
                    userId: input.userId
                });
            }
            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
