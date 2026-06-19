import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    emailAddress: z.string().optional(),
    created: z.string().optional(),
    active: z.boolean().optional(),
    emailAliases: z.array(z.string()).optional(),
    trustedEmailAddress: z.string().nullable().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    title: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    extension: z.string().nullable().optional(),
    personalMeetingUrls: z.array(z.string()).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    managerId: z.string().nullable().optional(),
    meetingConsentPageUrl: z.string().nullable().optional(),
    spokenLanguages: z
        .array(
            z.object({
                language: z.string(),
                primary: z.boolean().optional()
            })
        )
        .optional()
});

const GongUsersResponseSchema = z.object({
    users: z.array(z.object({}).passthrough()).optional(),
    records: z
        .object({
            totalRecords: z.number().optional(),
            currentPageSize: z.number().optional(),
            currentPageNumber: z.number().optional(),
            cursor: z.string().optional()
        })
        .optional()
});

const OutputUserSchema = z.object({
    id: z.string(),
    emailAddress: z.string().optional(),
    created: z.string().optional(),
    active: z.boolean().optional(),
    emailAliases: z.array(z.string()).optional(),
    trustedEmailAddress: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    title: z.string().optional(),
    phoneNumber: z.string().optional(),
    extension: z.string().optional(),
    personalMeetingUrls: z.array(z.string()).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
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

const OutputSchema = z.object({
    users: z.array(OutputUserSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List users from Gong',
    version: '1.0.1',
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
                ...(user.trustedEmailAddress != null && { trustedEmailAddress: user.trustedEmailAddress }),
                ...(user.firstName !== undefined && { firstName: user.firstName }),
                ...(user.lastName !== undefined && { lastName: user.lastName }),
                ...(user.title != null && { title: user.title }),
                ...(user.phoneNumber != null && { phoneNumber: user.phoneNumber }),
                ...(user.extension != null && { extension: user.extension }),
                ...(user.personalMeetingUrls !== undefined && { personalMeetingUrls: user.personalMeetingUrls }),
                ...(user.settings !== undefined && { settings: user.settings }),
                ...(user.managerId != null && { managerId: user.managerId }),
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
