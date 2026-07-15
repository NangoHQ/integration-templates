import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('Gong\'s unique numeric identifier for the user (up to 20 digits). Example: "7254376376091929519"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    emailAddress: z.string().nullable(),
    created: z.string().nullable(),
    active: z.boolean().nullable(),
    emailAliases: z.array(z.string()).nullish(),
    trustedEmailAddress: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    title: z.string().nullish(),
    phoneNumber: z.string().nullish(),
    extension: z.string().nullish(),
    personalMeetingUrls: z.array(z.string()).nullish(),
    settings: z
        .object({
            webConferencesRecorded: z.boolean().nullish(),
            preventWebConferenceRecording: z.boolean().nullish(),
            telephonyCallsImported: z.boolean().nullish(),
            emailsImported: z.boolean().nullish(),
            preventEmailImport: z.boolean().nullish(),
            nonRecordedMeetingsImported: z.boolean().nullish(),
            gongConnectEnabled: z.boolean().nullish()
        })
        .nullish(),
    managerId: z.string().nullish(),
    meetingConsentPageUrl: z.string().nullish(),
    spokenLanguages: z
        .array(
            z.object({
                language: z.string().nullable(),
                primary: z.boolean().nullish()
            })
        )
        .nullish()
});

const AxiosErrorSchema = z.object({
    response: z.object({ status: z.number(), data: z.unknown().optional() }).optional(),
    status: z.number().optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string(),
    user: ProviderUserSchema.nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    emailAddress: z.string().nullable(),
    created: z.string().nullable(),
    active: z.boolean().nullable(),
    emailAliases: z.array(z.string()).nullish(),
    trustedEmailAddress: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    title: z.string().nullish(),
    phoneNumber: z.string().nullish(),
    extension: z.string().nullish(),
    personalMeetingUrls: z.array(z.string()).nullish(),
    settings: z
        .object({
            webConferencesRecorded: z.boolean().nullish(),
            preventWebConferenceRecording: z.boolean().nullish(),
            telephonyCallsImported: z.boolean().nullish(),
            emailsImported: z.boolean().nullish(),
            preventEmailImport: z.boolean().nullish(),
            nonRecordedMeetingsImported: z.boolean().nullish(),
            gongConnectEnabled: z.boolean().nullish()
        })
        .nullish(),
    managerId: z.string().nullish(),
    meetingConsentPageUrl: z.string().nullish(),
    spokenLanguages: z
        .array(
            z.object({
                language: z.string().nullable(),
                primary: z.boolean().nullish()
            })
        )
        .nullish()
});

const action = createAction({
    description: 'Retrieve a single user from Gong.',
    version: '1.0.2',
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
            if (user === null) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Gong returned a user response without a user object.',
                    userId: input.userId
                });
            }

            return {
                id: user.id,
                emailAddress: user.emailAddress,
                created: user.created,
                active: user.active,
                ...(user.emailAliases != null && { emailAliases: user.emailAliases }),
                ...(user.trustedEmailAddress !== undefined && { trustedEmailAddress: user.trustedEmailAddress }),
                ...(user.firstName != null && { firstName: user.firstName }),
                ...(user.lastName != null && { lastName: user.lastName }),
                ...(user.title !== undefined && { title: user.title }),
                ...(user.phoneNumber !== undefined && { phoneNumber: user.phoneNumber }),
                ...(user.extension !== undefined && { extension: user.extension }),
                ...(user.personalMeetingUrls != null && { personalMeetingUrls: user.personalMeetingUrls }),
                ...(user.settings != null && { settings: user.settings }),
                ...(user.managerId !== undefined && { managerId: user.managerId }),
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
