import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ContactSchema = z
    .object({
        id: z.string().describe('Unique identifier of the contact. Brevo numeric contact ID serialized as a string, e.g. "42".'),
        email: z
            .string()
            .optional()
            .describe('Email address of the contact, e.g. "jane@example.com". Absent for contacts that have no email address (e.g. SMS-only contacts).'),
        emailBlacklisted: z.boolean().optional().describe('Whether the contact is blacklisted for email campaigns.'),
        smsBlacklisted: z.boolean().optional().describe('Whether the contact is blacklisted for SMS campaigns.'),
        whatsappBlacklisted: z.boolean().optional().describe('Whether the contact is blacklisted for WhatsApp campaigns.'),
        createdAt: z
            .string()
            .optional()
            .describe(
                'Date-time at which the contact was created, as an ISO 8601 timestamp with a provider-determined UTC offset (e.g. "2017-05-01T17:05:03+02:00"), not necessarily "Z"/UTC.'
            ),
        modifiedAt: z
            .string()
            .optional()
            .describe(
                'Date-time at which the contact was last modified, as an ISO 8601 timestamp with a provider-determined UTC offset (e.g. "2017-05-01T17:05:03+02:00"), not necessarily "Z"/UTC.'
            ),
        attributes: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Custom contact attributes keyed by attribute name, e.g. { "FIRSTNAME": "Meg", "LASTNAME": "Brennon" }.'),
        listIds: z.array(z.number()).optional().describe('IDs of the Brevo contact lists the contact belongs to, e.g. [2, 43].'),
        listUnsubscribed: z.array(z.number()).optional().describe('IDs of the contact lists the contact has unsubscribed from.')
    })
    .describe('A Brevo (Sendinblue) contact with its blacklist status, custom attributes, and list memberships.');

// Checkpoint fields must be plain ZodString/ZodNumber per the Nango SDK's
// ZodCheckpoint constraint; "no checkpoint yet" is represented by a null
// checkpoint rather than by absent fields.
const CheckpointSchema = z.object({
    modified_since: z.string(),
    runs_since_full: z.number().int()
});

const BrevoContactSchema = z.object({
    id: z.number(),
    email: z.string().optional(),
    emailBlacklisted: z.boolean().optional(),
    smsBlacklisted: z.boolean().optional(),
    whatsappBlacklisted: z.boolean().optional(),
    createdAt: z.string().optional(),
    modifiedAt: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    listIds: z.array(z.number()).optional(),
    // Confirmed live: the list endpoint returns listUnsubscribed as explicit null
    // for contacts that never unsubscribed from a list, not as an omitted field.
    listUnsubscribed: z.array(z.number()).nullable().optional()
});

// A modifiedSince-only crawl can never observe deletions (Brevo deletes contacts
// synchronously and exposes no deleted-records endpoint), so every Nth run crawls
// the full contact list inside a delete-tracking window instead.
const FULL_REFRESH_INTERVAL = 24;

const sync = createSync({
    description: 'Sync Brevo contacts, incrementally via the modifiedSince filter with a periodic full refresh to detect deletions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const modifiedSince = checkpoint?.modified_since;
        const runsSinceFull = checkpoint?.runs_since_full ?? FULL_REFRESH_INTERVAL;
        // Full refresh on the first run (no checkpoint) and every FULL_REFRESH_INTERVAL
        // runs afterwards. A full crawl must not pass modifiedSince: unchanged contacts
        // would be absent from the run and trackDeletesEnd would falsely mark them deleted.
        const isFullRefresh = checkpoint === null || runsSinceFull >= FULL_REFRESH_INTERVAL;

        if (isFullRefresh) {
            await nango.trackDeletesStart('Contact');
        }

        let maxModifiedAt = modifiedSince;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-contacts
            endpoint: '/contacts',
            params: {
                ...(!isFullRefresh && modifiedSince !== undefined ? { modifiedSince } : {})
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'contacts'
            },
            retries: 3
        };

        for await (const batch of nango.paginate<unknown>(proxyConfig)) {
            const contacts: z.infer<typeof ContactSchema>[] = [];
            for (const item of batch) {
                const parsed = BrevoContactSchema.safeParse(item);
                if (!parsed.success) {
                    // Never skip a record silently: inside a delete-tracked full refresh a
                    // skipped contact would be falsely marked as deleted.
                    throw new Error(`Failed to parse Brevo contact: ${parsed.error.message}`);
                }
                const contact = parsed.data;
                contacts.push({
                    id: String(contact.id),
                    ...(contact.email !== undefined && { email: contact.email }),
                    ...(contact.emailBlacklisted !== undefined && { emailBlacklisted: contact.emailBlacklisted }),
                    ...(contact.smsBlacklisted !== undefined && { smsBlacklisted: contact.smsBlacklisted }),
                    ...(contact.whatsappBlacklisted !== undefined && { whatsappBlacklisted: contact.whatsappBlacklisted }),
                    ...(contact.createdAt !== undefined && { createdAt: contact.createdAt }),
                    ...(contact.modifiedAt !== undefined && { modifiedAt: contact.modifiedAt }),
                    ...(contact.attributes !== undefined && { attributes: contact.attributes }),
                    ...(contact.listIds !== undefined && { listIds: contact.listIds }),
                    ...(contact.listUnsubscribed != null && { listUnsubscribed: contact.listUnsubscribed })
                });
                if (contact.modifiedAt !== undefined && (maxModifiedAt === undefined || Date.parse(contact.modifiedAt) > Date.parse(maxModifiedAt))) {
                    maxModifiedAt = contact.modifiedAt;
                }
            }

            if (contacts.length > 0) {
                await nango.batchSave(contacts, 'Contact');
            }
        }

        if (isFullRefresh) {
            // Persist progress only once the full scan completes: a mid-scan checkpoint
            // would make a crashed run look like a plain incremental run on retry and
            // silently skip delete tracking. Close the delete window before saving the
            // checkpoint so a crash in between forces another full refresh next time.
            await nango.trackDeletesEnd('Contact');
            if (maxModifiedAt !== undefined) {
                await nango.saveCheckpoint({ modified_since: maxModifiedAt, runs_since_full: 0 });
            }
        } else if (maxModifiedAt !== undefined) {
            // Save the incremental checkpoint only after the crawl finishes. Advancing it
            // mid-run risks skipping later pages if the sync crashes before completion.
            await nango.saveCheckpoint({
                modified_since: maxModifiedAt,
                runs_since_full: runsSinceFull + 1
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
