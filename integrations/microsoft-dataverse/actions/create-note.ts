import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        parentEntitySetName: z
            .string()
            .describe(
                'Entity set name (plural collection name) of the parent record the note is attached to. Example: "accounts" for an account, "contacts" for a contact, "opportunities" for an opportunity. Custom entities use their own entity set name, discoverable via the EntityDefinitions metadata.'
            ),
        parentEntityLogicalName: z
            .string()
            .describe(
                'Logical name (singular) of the parent record\'s entity, used to build the entity-specific bind property "objectid_<logicalName>@odata.bind". Example: "account" for a note on an account, "contact" for a note on a contact.'
            ),
        parentId: z.string().describe('ID (GUID) of the parent record the note is attached to. Example: "88cea450-cb0c-ea11-a813-000d3a1b1223".'),
        notetext: z.string().describe('Text body of the note. Example: "Customer requested a follow-up call next week."'),
        subject: z.string().optional().describe('Optional subject (title) of the note. Example: "Follow-up call".')
    })
    .describe('Input for creating a note (annotation) attached to a parent record in Microsoft Dataverse.');

const OutputSchema = z
    .object({
        id: z.string().describe('ID (GUID) of the created note (annotation) record. Example: "4f8b3c2e-1a2d-4e5f-9a8b-7c6d5e4f3a2b".')
    })
    .describe('Identifiers of the created note (annotation) record.');

/**
 * @tags: [write]
 * @tagReason: Creates a new note (annotation) record via POST; performs no provider reads, deletes, or other mutations.
 * @pitfalls: parentEntityLogicalName and parentEntitySetName must correspond to the same entity (e.g. "account" with "accounts"); the provider derives the parent bind property from the logical name and rejects mismatched or unknown entity pairs.
 */
const action = createAction({
    description: 'Create a note attached to a parent record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const bindProperty = `objectid_${input.parentEntityLogicalName}@odata.bind`;
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api
        const response = await nango.post<void>({
            endpoint: '/api/data/v9.2/annotations',
            data: {
                notetext: input.notetext,
                ...(input.subject !== undefined && { subject: input.subject }),
                [bindProperty]: `/${encodeURIComponent(input.parentEntitySetName)}(${encodeURIComponent(input.parentId)})`
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries is deliberately 0: creating a note is not idempotent (no idempotency key), so retrying after a lost response would create a duplicate note.
            retries: 0
        });

        // Dataverse returns 204 No Content on create; the new record's URL (and id) is only in the OData-EntityId response header.
        const entityIdHeader = response.headers['odata-entityid'];
        const match = typeof entityIdHeader === 'string' ? entityIdHeader.match(/\(([\da-fA-F-]{36})\)\s*$/) : null;
        const id = match ? match[1] : undefined;
        if (!id) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The create request succeeded but the OData-EntityId response header carrying the new note id was missing or malformed.'
            });
        }

        return { id };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
