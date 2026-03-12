import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    body: z.string().optional().describe('The note text content. Limited to 65,536 characters.'),
    timestamp: z.string().describe('The note timestamp in ISO 8601 UTC format (e.g., "2021-11-12T15:48:22Z") or Unix timestamp in milliseconds.'),
    owner_id: z.string().optional().describe('The HubSpot owner ID associated with the note.'),
    attachment_ids: z.array(z.string()).optional().describe('IDs of attachments to associate with the note.'),
    association: z
        .object({
            object_type: z.enum(['contact', 'company', 'deal', 'ticket']).describe('The type of object to associate the note with.'),
            object_id: z.string().describe('The ID of the record to associate the note with.')
        })
        .describe('The association to a contact, company, deal, or ticket.')
});

const OutputSchema = z.object({
    id: z.string(),
    body: z.union([z.string(), z.null()]),
    timestamp: z.union([z.string(), z.null()]),
    owner_id: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Create a HubSpot note with body, timestamp, owner, optional attachments, and an explicit association to a contact, company, deal, or ticket.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-note',
        group: 'Notes'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.write', 'crm.objects.contacts.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const properties: Record<string, string> = {
            hs_timestamp: input.timestamp
        };

        if (input.body) {
            properties['hs_note_body'] = input.body;
        }

        if (input.owner_id) {
            properties['hubspot_owner_id'] = input.owner_id;
        }

        if (input.attachment_ids && input.attachment_ids.length > 0) {
            properties['hs_attachment_ids'] = input.attachment_ids.join(';');
        }

        const associationTypeIds: Record<string, number> = {
            contact: 202,
            company: 190,
            deal: 214,
            ticket: 223
        };

        const associations = [
            {
                to: {
                    id: input.association.object_id
                },
                types: [
                    {
                        associationCategory: 'HUBSPOT_DEFINED',
                        associationTypeId: associationTypeIds[input.association.object_type]
                    }
                ]
            }
        ];

        // https://developers.hubspot.com/docs/reference/api/crm/engagements/notes
        const response = await nango.post({
            endpoint: '/crm/v3/objects/notes',
            data: {
                properties,
                associations
            },
            retries: 10
        });

        const data = response.data;

        return {
            id: data.id,
            body: data.properties?.['hs_note_body'] ?? null,
            timestamp: data.properties?.['hs_timestamp'] ?? null,
            owner_id: data.properties?.['hubspot_owner_id'] ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
