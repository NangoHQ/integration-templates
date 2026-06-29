import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string().describe('Gong user ID. Example: "234599484848423"'),
    active: z.boolean().nullish(),
    created: z.string().nullish().describe('Creation time in ISO-8601 format. Example: "2018-02-17T02:30:00-08:00"'),
    emailAddress: z.string().nullish().describe('Email address. Example: "test@test.com"'),
    emailAliases: z.array(z.string()).nullish(),
    extension: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    managerId: z.string().nullish().describe('Manager ID. Example: "563515258458745"'),
    meetingConsentPageUrl: z.string().nullish(),
    personalMeetingUrls: z.array(z.string()).nullish(),
    phoneNumber: z.string().nullish(),
    settings: z
        .object({
            emailsImported: z.boolean().nullish(),
            nonRecordedMeetingsImported: z.boolean().nullish(),
            preventEmailImport: z.boolean().nullish(),
            preventWebConferenceRecording: z.boolean().nullish(),
            telephonyCallsImported: z.boolean().nullish(),
            webConferencesRecorded: z.boolean().nullish()
        })
        .passthrough()
        .nullish(),
    spokenLanguages: z
        .array(
            z.object({
                language: z.string().nullish(),
                primary: z.boolean().nullish()
            })
        )
        .nullish(),
    title: z.string().nullish()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    active: z.boolean().nullish(),
    created: z.string().nullish(),
    emailAddress: z.string().nullish(),
    emailAliases: z.array(z.string()).nullish(),
    extension: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    managerId: z.string().nullish(),
    meetingConsentPageUrl: z.string().nullish(),
    personalMeetingUrls: z.array(z.string()).nullish(),
    phoneNumber: z.string().nullish(),
    settings: z
        .object({
            emailsImported: z.boolean().nullish(),
            nonRecordedMeetingsImported: z.boolean().nullish(),
            preventEmailImport: z.boolean().nullish(),
            preventWebConferenceRecording: z.boolean().nullish(),
            telephonyCallsImported: z.boolean().nullish(),
            webConferencesRecorded: z.boolean().nullish()
        })
        .passthrough()
        .nullish(),
    spokenLanguages: z
        .array(
            z.object({
                language: z.string().nullish(),
                primary: z.boolean().nullish()
            })
        )
        .nullish(),
    title: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    records: z
        .object({
            totalRecords: z.number().nullish(),
            currentPageSize: z.number().nullish(),
            currentPageNumber: z.number().nullish(),
            cursor: z.string().nullish()
        })
        .nullish(),
    users: z.array(ProviderUserSchema).nullish()
});

const CheckpointSchema = z.object({
    cursor: z.string().describe('Pagination cursor for resuming a full refresh')
});

function normalizeToUtc(isoString: string): string {
    const date = new Date(isoString);
    return date.toISOString();
}

const sync = createSync({
    description: 'Sync users from Gong',
    version: '1.1.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/users'
        }
    ],
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint && typeof checkpoint['cursor'] === 'string' && checkpoint['cursor'] !== '' ? checkpoint['cursor'] : undefined;
        let hasCheckpoint = cursor !== undefined;

        // /v2/users/extensive only exposes creation-time filters, so an
        // incremental checkpoint would miss updates to existing users.
        // Run a full refresh and use the cursor checkpoint only for resume.
        await nango.trackDeletesStart('User');

        while (true) {
            const response = await nango.post({
                // https://help.gong.io/apidocs/list-users-by-filter-v2usersextensive
                endpoint: '/v2/users/extensive',
                data: {
                    filter: {},
                    ...(cursor && { cursor })
                },
                retries: 3
            });

            const parsed = ProviderResponseSchema.parse(response.data);
            const users = parsed.users ?? [];

            const mappedUsers = users.flatMap((user) => {
                if (!user.id) {
                    return [];
                }

                return [
                    {
                        id: user.id,
                        ...(user.active !== undefined && { active: user.active }),
                        ...(user.created != null && { created: normalizeToUtc(user.created) }),
                        ...(user.emailAddress !== undefined && { emailAddress: user.emailAddress }),
                        ...(user.emailAliases !== undefined && { emailAliases: user.emailAliases }),
                        ...(user.extension !== undefined && { extension: user.extension }),
                        ...(user.firstName !== undefined && { firstName: user.firstName }),
                        ...(user.lastName !== undefined && { lastName: user.lastName }),
                        ...(user.managerId !== undefined && { managerId: user.managerId }),
                        ...(user.meetingConsentPageUrl !== undefined &&
                            user.meetingConsentPageUrl !== null && { meetingConsentPageUrl: user.meetingConsentPageUrl }),
                        ...(user.personalMeetingUrls !== undefined && { personalMeetingUrls: user.personalMeetingUrls }),
                        ...(user.phoneNumber !== undefined && { phoneNumber: user.phoneNumber }),
                        ...(user.settings !== undefined && { settings: user.settings }),
                        ...(user.spokenLanguages !== undefined && { spokenLanguages: user.spokenLanguages }),
                        ...(user.title !== undefined && { title: user.title })
                    }
                ];
            });

            if (mappedUsers.length > 0) {
                await nango.batchSave(mappedUsers, 'User');
            }

            const nextCursor = parsed.records?.cursor;
            if (!nextCursor) {
                if (hasCheckpoint) {
                    await nango.clearCheckpoint();
                }
                await nango.trackDeletesEnd('User');
                return;
            }

            cursor = nextCursor;
            await nango.saveCheckpoint({ cursor });
            hasCheckpoint = true;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
