import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderVacationSettingsSchema = z.object({
    enableAutoReply: z.boolean(),
    responseSubject: z.string().optional(),
    responseBodyPlainText: z.string().optional(),
    responseBodyHtml: z.string().optional(),
    restrictToContacts: z.boolean().optional(),
    restrictToDomain: z.boolean().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional()
});

const OutputSchema = z.object({
    enableAutoReply: z.boolean(),
    responseSubject: z.string().optional(),
    responseBodyPlainText: z.string().optional(),
    responseBodyHtml: z.string().optional(),
    restrictToContacts: z.boolean().optional(),
    restrictToDomain: z.boolean().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional()
});

const action = createAction({
    description: 'Retrieve the mailbox vacation responder settings.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/getVacation
        const response = await nango.get({
            endpoint: '/gmail/v1/users/me/settings/vacation',
            retries: 3
        });

        const vacationSettings = ProviderVacationSettingsSchema.parse(response.data);

        return {
            enableAutoReply: vacationSettings.enableAutoReply,
            ...(vacationSettings.responseSubject !== undefined && { responseSubject: vacationSettings.responseSubject }),
            ...(vacationSettings.responseBodyPlainText !== undefined && { responseBodyPlainText: vacationSettings.responseBodyPlainText }),
            ...(vacationSettings.responseBodyHtml !== undefined && { responseBodyHtml: vacationSettings.responseBodyHtml }),
            ...(vacationSettings.restrictToContacts !== undefined && { restrictToContacts: vacationSettings.restrictToContacts }),
            ...(vacationSettings.restrictToDomain !== undefined && { restrictToDomain: vacationSettings.restrictToDomain }),
            ...(vacationSettings.startTime !== undefined && { startTime: vacationSettings.startTime }),
            ...(vacationSettings.endTime !== undefined && { endTime: vacationSettings.endTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
