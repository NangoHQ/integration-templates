import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    time_entry_id: z.string().describe('The ID of the time entry to delete. Example: "5090290025624291206"')
});

const DeletedTimeEntrySchema = z
    .object({
        id: z.string(),
        task: z
            .object({
                id: z.string().optional(),
                name: z.string().optional()
            })
            .passthrough()
            .optional(),
        user: z
            .object({
                id: z.number().optional(),
                username: z.string().optional(),
                email: z.string().optional()
            })
            .passthrough()
            .optional(),
        billable: z.boolean().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
        duration: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.any()).optional(),
        source: z.string().optional(),
        at: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(DeletedTimeEntrySchema)
});

const OutputSchema = z.object({
    deleted: z.boolean(),
    time_entry: DeletedTimeEntrySchema.optional()
});

const MetadataSchema = z.object({
    team_id: z.string().describe('ClickUp team ID (workspace ID). Example: "90152560096"')
});

const action = createAction({
    description: 'Delete a time entry in ClickUp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        const teamId = metadata?.team_id;

        if (!teamId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'team_id is required in metadata. Please provide the ClickUp team/workspace ID.'
            });
        }

        if (!input.time_entry_id) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'time_entry_id is required in input.'
            });
        }

        // https://developer.clickup.com/reference/deletetimetrackingentry
        const response = await nango.delete({
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/time_entries/${encodeURIComponent(input.time_entry_id)}`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        if (!providerData.data || providerData.data.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Time entry not found or already deleted.',
                time_entry_id: input.time_entry_id
            });
        }

        const deletedEntry = providerData.data[0];

        return {
            deleted: true,
            time_entry: deletedEntry
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
