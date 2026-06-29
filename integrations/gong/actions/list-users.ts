import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    emailAddress: z.string().nullish(),
    created: z.string().nullish(),
    active: z.boolean().nullish(),
    emailAliases: z.array(z.string()).nullish(),
    trustedEmailAddress: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    title: z.string().nullish(),
    phoneNumber: z.string().nullish(),
    extension: z.string().nullish(),
    personalMeetingUrls: z.array(z.string()).nullish(),
    settings: z.record(z.string(), z.unknown()).nullish(),
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

const GongUsersResponseSchema = z.object({
    users: z.array(z.object({}).passthrough()).nullish(),
    records: z
        .object({
            totalRecords: z.number().nullish(),
            currentPageSize: z.number().nullish(),
            currentPageNumber: z.number().nullish(),
            cursor: z.string().nullish()
        })
        .nullish()
});

const OutputUserSchema = z.object({
    id: z.string(),
    emailAddress: z.string().nullish(),
    created: z.string().nullish(),
    active: z.boolean().nullish(),
    emailAliases: z.array(z.string()).nullish(),
    trustedEmailAddress: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    title: z.string().nullish(),
    phoneNumber: z.string().nullish(),
    extension: z.string().nullish(),
    personalMeetingUrls: z.array(z.string()).nullish(),
    settings: z.record(z.string(), z.unknown()).nullish(),
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

const OutputSchema = z.object({
    users: z.array(OutputUserSchema).nullable(),
    nextCursor: z.string().nullish()
});

const action = createAction({
    description: 'List users from Gong',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.gong.io/docs/what-the-gong-api-provides
            endpoint: '/v2/users',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const parsedResponse = GongUsersResponseSchema.parse(response.data);

        const users: z.infer<typeof OutputUserSchema>[] = [];
        for (const rawUser of parsedResponse.users || []) {
            const parsed = ProviderUserSchema.safeParse(rawUser);
            if (!parsed.success) {
                continue;
            }
            const user = parsed.data;
            users.push({
                id: user.id,
                ...(user.emailAddress !== undefined && { emailAddress: user.emailAddress }),
                ...(user.created !== undefined && { created: user.created }),
                ...(user.active !== undefined && { active: user.active }),
                ...(user.emailAliases !== undefined && { emailAliases: user.emailAliases }),
                ...(user.trustedEmailAddress !== undefined && { trustedEmailAddress: user.trustedEmailAddress }),
                ...(user.firstName !== undefined && { firstName: user.firstName }),
                ...(user.lastName !== undefined && { lastName: user.lastName }),
                ...(user.title !== undefined && { title: user.title }),
                ...(user.phoneNumber !== undefined && { phoneNumber: user.phoneNumber }),
                ...(user.extension !== undefined && { extension: user.extension }),
                ...(user.personalMeetingUrls !== undefined && { personalMeetingUrls: user.personalMeetingUrls }),
                ...(user.settings !== undefined && { settings: user.settings }),
                ...(user.managerId !== undefined && { managerId: user.managerId }),
                ...(user.meetingConsentPageUrl != null && { meetingConsentPageUrl: user.meetingConsentPageUrl }),
                ...(user.spokenLanguages !== undefined && { spokenLanguages: user.spokenLanguages })
            });
        }

        return {
            users,
            ...(parsedResponse.records?.cursor !== undefined && { nextCursor: parsedResponse.records.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
