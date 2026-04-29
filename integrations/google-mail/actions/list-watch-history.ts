import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    startHistoryId: z.string().describe('Start history ID to return history records after. Example: "1234567890"'),
    historyTypes: z
        .array(
            z.enum([
                'messageAdded',
                'messageDeleted',
                'labelAdded',
                'labelRemoved',
                'systemLabelAdded',
                'systemLabelRemoved',
                'messageLabelAdded',
                'messageLabelRemoved',
                'messageStarAdded',
                'messageStarRemoved',
                'draftAdded',
                'draftDeleted',
                'domainSettingsUpdate',
                'filterAdded',
                'filterRemoved',
                'forwardingAddressAdded',
                'forwardingAddressRemoved',
                'sendAsAliasAdded',
                'sendAsAliasRemoved',
                'vacationSettingsUpdate',
                'autoForwardingSettingsUpdate',
                'imapSettingsUpdate',
                'popSettingsUpdate',
                'languageSettingsUpdate',
                'emailSettingsUpdate'
            ])
        )
        .optional()
        .describe('History types to return. If not specified, all history types are returned.'),
    labelId: z.string().optional().describe('Only return history for this label. Example: "Label_1"'),
    maxResults: z.number().optional().describe('Maximum number of history records to return.'),
    pageToken: z.string().optional().describe('Page token to retrieve a specific page of results.')
});

const HistoryMessageAddedSchema = z.object({
    message: z.object({
        id: z.string(),
        threadId: z.string(),
        labelIds: z.array(z.string()).optional(),
        historyId: z.string().optional()
    })
});

const HistoryMessageDeletedSchema = z.object({
    message: z.object({
        id: z.string(),
        threadId: z.string(),
        labelIds: z.array(z.string()).optional(),
        historyId: z.string().optional()
    })
});

const HistoryLabelAddedSchema = z.object({
    message: z.object({
        id: z.string(),
        threadId: z.string(),
        labelIds: z.array(z.string()).optional()
    }),
    labelIds: z.array(z.string())
});

const HistoryLabelRemovedSchema = z.object({
    message: z.object({
        id: z.string(),
        threadId: z.string(),
        labelIds: z.array(z.string()).optional()
    }),
    labelIds: z.array(z.string())
});

const HistoryRecordSchema = z.object({
    id: z.string(),
    messages: z
        .array(
            z.object({
                id: z.string(),
                threadId: z.string(),
                labelIds: z.array(z.string()).optional(),
                historyId: z.string().optional()
            })
        )
        .optional(),
    messagesAdded: z.array(HistoryMessageAddedSchema).optional(),
    messagesDeleted: z.array(HistoryMessageDeletedSchema).optional(),
    labelsAdded: z.array(HistoryLabelAddedSchema).optional(),
    labelsRemoved: z.array(HistoryLabelRemovedSchema).optional()
});

const ProviderHistorySchema = z.object({
    history: z.array(HistoryRecordSchema).optional(),
    historyId: z.string().optional(),
    nextPageToken: z.string().optional()
});

const OutputSchema = z.object({
    history: z.array(
        z.object({
            id: z.string(),
            messages: z
                .array(
                    z.object({
                        id: z.string(),
                        threadId: z.string(),
                        labelIds: z.array(z.string()).optional(),
                        historyId: z.string().optional()
                    })
                )
                .optional(),
            messagesAdded: z
                .array(
                    z.object({
                        message: z.object({
                            id: z.string(),
                            threadId: z.string(),
                            labelIds: z.array(z.string()).optional(),
                            historyId: z.string().optional()
                        })
                    })
                )
                .optional(),
            messagesDeleted: z
                .array(
                    z.object({
                        message: z.object({
                            id: z.string(),
                            threadId: z.string(),
                            labelIds: z.array(z.string()).optional(),
                            historyId: z.string().optional()
                        })
                    })
                )
                .optional(),
            labelsAdded: z
                .array(
                    z.object({
                        message: z.object({
                            id: z.string(),
                            threadId: z.string(),
                            labelIds: z.array(z.string()).optional()
                        }),
                        labelIds: z.array(z.string())
                    })
                )
                .optional(),
            labelsRemoved: z
                .array(
                    z.object({
                        message: z.object({
                            id: z.string(),
                            threadId: z.string(),
                            labelIds: z.array(z.string()).optional()
                        }),
                        labelIds: z.array(z.string())
                    })
                )
                .optional()
        })
    ),
    historyId: z.string().optional(),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'List mailbox history records after a given history ID',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-watch-history',
        group: 'History'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[]> = {
            startHistoryId: input.startHistoryId
        };

        if (input.historyTypes !== undefined && input.historyTypes.length > 0) {
            params['historyTypes'] = input.historyTypes;
        }

        if (input.labelId !== undefined) {
            params['labelId'] = input.labelId;
        }

        if (input.maxResults !== undefined) {
            params['maxResults'] = input.maxResults;
        }

        if (input.pageToken !== undefined) {
            params['pageToken'] = input.pageToken;
        }

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list
        const response = await nango.get({
            endpoint: '/gmail/v1/users/me/history',
            params,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Invalid startHistoryId. The provided history ID was not found.',
                startHistoryId: input.startHistoryId
            });
        }

        const providerData = ProviderHistorySchema.parse(response.data);

        return {
            history: providerData.history ?? [],
            historyId: providerData.historyId,
            nextPageToken: providerData.nextPageToken
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
