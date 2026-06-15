import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string().describe('Gong user ID. Example: "234599484848423"'),
    active: z.boolean().optional(),
    created: z.string().optional().describe('Creation time in ISO-8601 format. Example: "2018-02-17T02:30:00-08:00"'),
    emailAddress: z.string().optional().describe('Email address. Example: "test@test.com"'),
    emailAliases: z.array(z.string()).optional(),
    extension: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    managerId: z.string().optional().describe('Manager ID. Example: "563515258458745"'),
    meetingConsentPageUrl: z.string().optional(),
    personalMeetingUrls: z.array(z.string()).optional(),
    phoneNumber: z.string().optional(),
    settings: z
        .object({
            emailsImported: z.boolean().optional(),
            nonRecordedMeetingsImported: z.boolean().optional(),
            preventEmailImport: z.boolean().optional(),
            preventWebConferenceRecording: z.boolean().optional(),
            telephonyCallsImported: z.boolean().optional(),
            webConferencesRecorded: z.boolean().optional()
        })
        .passthrough()
        .optional(),
    spokenLanguages: z
        .array(
            z.object({
                language: z.string().optional(),
                primary: z.boolean().optional()
            })
        )
        .optional(),
    title: z.string().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    active: z.boolean().optional(),
    created: z.string().optional(),
    emailAddress: z.string().optional(),
    emailAliases: z.array(z.string()).optional(),
    extension: z.string().nullable().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    managerId: z.string().nullable().optional(),
    meetingConsentPageUrl: z.string().nullable().optional(),
    personalMeetingUrls: z.array(z.string()).optional(),
    phoneNumber: z.string().nullable().optional(),
    settings: z
        .object({
            emailsImported: z.boolean().optional(),
            nonRecordedMeetingsImported: z.boolean().optional(),
            preventEmailImport: z.boolean().optional(),
            preventWebConferenceRecording: z.boolean().optional(),
            telephonyCallsImported: z.boolean().optional(),
            webConferencesRecorded: z.boolean().optional()
        })
        .passthrough()
        .optional(),
    spokenLanguages: z
        .array(
            z.object({
                language: z.string().optional(),
                primary: z.boolean().optional()
            })
        )
        .optional(),
    title: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    records: z
        .object({
            totalRecords: z.number().optional(),
            currentPageSize: z.number().optional(),
            currentPageNumber: z.number().optional(),
            cursor: z.string().optional()
        })
        .optional(),
    users: z.array(ProviderUserSchema).optional()
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
    version: '1.1.0',
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

            const mappedUsers = users.map((user) => ({
                id: user.id,
                ...(user.active !== undefined && { active: user.active }),
                ...(user.created !== undefined && { created: normalizeToUtc(user.created) }),
                ...(user.emailAddress !== undefined && { emailAddress: user.emailAddress }),
                ...(user.emailAliases !== undefined && { emailAliases: user.emailAliases }),
                ...(user.extension !== undefined && user.extension !== null && { extension: user.extension }),
                ...(user.firstName !== undefined && { firstName: user.firstName }),
                ...(user.lastName !== undefined && { lastName: user.lastName }),
                ...(user.managerId !== undefined && user.managerId !== null && { managerId: user.managerId }),
                ...(user.meetingConsentPageUrl !== undefined && user.meetingConsentPageUrl !== null && { meetingConsentPageUrl: user.meetingConsentPageUrl }),
                ...(user.personalMeetingUrls !== undefined && { personalMeetingUrls: user.personalMeetingUrls }),
                ...(user.phoneNumber !== undefined && user.phoneNumber !== null && { phoneNumber: user.phoneNumber }),
                ...(user.settings !== undefined && { settings: user.settings }),
                ...(user.spokenLanguages !== undefined && { spokenLanguages: user.spokenLanguages }),
                ...(user.title !== undefined && user.title !== null && { title: user.title })
            }));

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
