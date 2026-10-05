import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        entitySetName: z
            .string()
            .describe(
                'Entity set name of the record to delete, e.g. "accounts", "contacts", "leads", "opportunities", "incidents", "tasks". The entity set name for any entity in the org (including custom entities) can be discovered through the EntityDefinitions metadata. Example: "leads"'
            ),
        id: z.string().describe('GUID of the record to delete, without quotes or parentheses. Example: "1e6b0f5e-1c2d-4e5f-9a8b-7c6d5e4f3a2b"')
    })
    .describe('Input for deleting a record of any Dataverse entity');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the provider confirmed the deletion (HTTP 204 No Content)'),
        id: z.string().describe('GUID of the deleted record, echoed back from the input'),
        entitySetName: z.string().describe('Entity set name the record was deleted from, echoed back from the input')
    })
    .describe('Confirmation that the record was deleted');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a record in the provider org by id; the deletion is a provider-side mutation that is immediate and permanent (no soft-delete or recycle bin is exposed through this API).
 * @pitfalls: Deletion is immediate and permanent: there is no soft-delete, and a follow-up read of the same id returns 404. Deleting an id that does not exist also fails with a 404 error. Depending on the entity's relationship configuration, the delete may cascade to related child records (such as its notes or activities) or be blocked while related records exist.
 */
const action = createAction({
    description: 'Delete a record of any Dataverse entity by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api#basic-delete
        await nango.delete({
            endpoint: `/api/data/v9.2/${encodeURIComponent(input.entitySetName)}(${encodeURIComponent(input.id)})`,
            // retries: 0 is deliberate — deletion cannot be blindly retried: a retry after a lost 204 response would hit a 404 on the already-deleted record and surface a spurious failure.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return {
            success: true,
            id: input.id,
            entitySetName: input.entitySetName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
