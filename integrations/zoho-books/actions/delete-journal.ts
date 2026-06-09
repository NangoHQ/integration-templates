import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    journal_id: z.string().describe('The ID of the manual journal entry to delete. Example: "260815000000115005"')
});

const OutputSchema = z.object({
    journal_id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a manual journal entry in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-journal',
        group: 'Journals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.fullaccess.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        const metadataSchema = z.object({
            organization_id: z.string()
        });

        const parsedMetadata = metadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'organization_id is required in metadata.'
            });
        }

        const organizationId = parsedMetadata.data.organization_id;

        // https://www.zoho.com/books/api/v3/journals/#delete-a-journal
        const response = await nango.delete({
            endpoint: `/books/v3/journals/${encodeURIComponent(input.journal_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const responseSchema = z.object({
            code: z.number().optional(),
            message: z.string().optional()
        });

        const parsedResponse = responseSchema.parse(response.data);

        if (parsedResponse.code !== undefined && parsedResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsedResponse.message || 'Failed to delete journal',
                code: parsedResponse.code
            });
        }

        return {
            journal_id: input.journal_id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
