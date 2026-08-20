import { z } from 'zod';
import { createAction } from 'nango';

const ContactUpdateSchema = z.object({
    email: z.string().optional().describe('Primary email address to set on the merged contact.'),
    phone: z.string().optional().describe('Telephone number to set on the merged contact.'),
    mobile: z.string().optional().describe('Mobile number to set on the merged contact.'),
    twitter_id: z.string().optional().describe('Twitter handle ID to set on the merged contact.'),
    unique_external_id: z.string().optional().describe('External ID to set on the merged contact.'),
    other_emails: z.array(z.string()).optional().describe('Additional email addresses to associate with the merged contact.'),
    company_ids: z.array(z.number()).optional().describe('Company IDs to associate with the merged contact.')
});

const InputSchema = z
    .object({
        primary_contact_id: z.number().describe('ID of the primary contact that will retain the merged data.'),
        secondary_contact_ids: z.array(z.number()).min(1).describe('IDs of the secondary contacts to merge into the primary contact.'),
        contact: ContactUpdateSchema.optional().describe('Attributes to update on the primary contact during the merge.')
    })
    .describe('Parameters to merge one or more Freshdesk contacts into a primary contact.');

/**
 * @tags: [write, destructive]
 * @tagReason: Merges secondary contacts into a primary contact, permanently combining their data and removing the secondary records.
 * @pitfalls: Merging fails when the primary and any secondary contact share a phone, mobile, Twitter handle ID, or unique external ID unless that field is included in the contact update payload.
 */
const action = createAction({
    description: 'Merge one or more Freshdesk contacts into a primary contact.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('The Freshdesk merge contacts endpoint returns 204 No Content with no response body.'),

    exec: async (nango, input): Promise<null> => {
        // https://developers.freshdesk.com/api/#merge_contacts
        await nango.post({
            endpoint: '/api/v2/contacts/merge',
            data: {
                primary_contact_id: input.primary_contact_id,
                secondary_contact_ids: input.secondary_contact_ids,
                ...(input.contact !== undefined && { contact: input.contact })
            },
            retries: 10
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
