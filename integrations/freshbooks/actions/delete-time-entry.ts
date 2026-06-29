import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    timeEntryId: z.string().describe('The ID of the time entry to delete. Example: "123456"')
});

const MetadataSchema = z.object({
    accountId: z.string().describe('The FreshBooks account ID. Example: "ZyQ04o"'),
    businessId: z.string().describe('The FreshBooks business ID. Example: "14719708"')
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the deleted time entry.'),
    success: z.boolean().describe('Whether the deletion was successful.')
});

const action = createAction({
    description: 'Delete a time entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:time_entries:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);

        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing required connection metadata. Please run get-account-id first to populate accountId and businessId.'
            });
        }

        const metadata = metadataResult.data;
        const { timeEntryId } = input;

        await nango.delete({
            // https://www.freshbooks.com/api
            endpoint: `/timetracking/business/${encodeURIComponent(metadata.businessId)}/time_entries/${encodeURIComponent(timeEntryId)}`,
            retries: 3
        });

        return {
            id: timeEntryId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
