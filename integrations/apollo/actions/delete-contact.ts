import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Apollo contact ID to delete. Example: "6a0af20f499fdc0010dfadaf"')
});

const DeleteResponseSchema = z.object({
    id: z.string().optional(),
    deleted: z.boolean().optional()
});

const PatchResponseSchema = z.object({
    id: z.string().optional(),
    existence_level: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean(),
    archived: z.boolean().optional()
});

const action = createAction({
    description: 'Delete or archive a contact in Apollo',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_destroy', 'contacts_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const contactId = input.contactId;

        // Try hard delete first with DELETE endpoint
        // https://docs.apollo.io/reference/delete-contact
        // @allowTryCatch Fallback to archive on 403 (missing destroy scope)
        try {
            const deleteResponse = await nango.delete({
                endpoint: `/v1/contacts/${encodeURIComponent(contactId)}`,
                retries: 3
            });

            // Handle 200 success response
            if (deleteResponse.status === 200) {
                const parsedData = DeleteResponseSchema.safeParse(deleteResponse.data);
                if (parsedData.success) {
                    return {
                        id: parsedData.data.id ?? contactId,
                        deleted: parsedData.data.deleted ?? true
                    };
                }
                return {
                    id: contactId,
                    deleted: true
                };
            }
        } catch (error) {
            // Check if error is 403 - permission denied (missing contact_destroy scope)
            if (
                error &&
                typeof error === 'object' &&
                'response' in error &&
                error.response &&
                typeof error.response === 'object' &&
                'status' in error.response &&
                error.response.status === 403
            ) {
                // Permission denied - fall through to archive via PATCH
            } else {
                // Re-throw other errors
                throw error;
            }
        }

        // Fallback: archive via PATCH with existence_level: 'none'
        // https://docs.apollo.io/reference/update-contact
        const patchResponse = await nango.patch({
            endpoint: `/v1/contacts/${encodeURIComponent(contactId)}`,
            data: {
                existence_level: 'none'
            },
            retries: 3
        });

        if (patchResponse.status !== 200) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete or archive contact',
                contact_id: contactId,
                status: patchResponse.status
            });
        }

        const parsedPatchData = PatchResponseSchema.safeParse(patchResponse.data);
        if (parsedPatchData.success) {
            return {
                id: parsedPatchData.data.id ?? contactId,
                deleted: false,
                archived: parsedPatchData.data.existence_level === 'none'
            };
        }

        return {
            id: contactId,
            deleted: false,
            archived: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
