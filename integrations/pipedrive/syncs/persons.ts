import { createSync } from 'nango';
import { z } from 'zod';

// https://developers.pipedrive.com/docs/api/v1/Persons
const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string(),
    emails: z
        .array(
            z.object({
                value: z.string(),
                primary: z.boolean().optional(),
                label: z.string().optional()
            })
        )
        .optional(),
    phones: z
        .array(
            z.object({
                value: z.string(),
                primary: z.boolean().optional(),
                label: z.string().optional()
            })
        )
        .optional(),
    org_id: z.number().nullable().optional(),
    owner_id: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string()
});

const PersonSchema = z.object({
    id: z.string(),
    name: z.string(),
    emails: z
        .array(
            z.object({
                value: z.string(),
                primary: z.boolean().optional(),
                label: z.string().optional()
            })
        )
        .optional(),
    phones: z
        .array(
            z.object({
                value: z.string(),
                primary: z.boolean().optional(),
                label: z.string().optional()
            })
        )
        .optional(),
    org_id: z.number().optional(),
    owner_id: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string()
});

// Checkpoint schema must match ZodCheckpoint type: non-optional fields with primitive types
const CheckpointSchema = z.object({
    updated_after: z.string()
});

type ProviderPerson = z.infer<typeof ProviderPersonSchema>;

const sync = createSync({
    description: 'Sync persons from Pipedrive.',
    version: '2.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/persons' }],
    checkpoint: CheckpointSchema,
    models: {
        Person: PersonSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        // https://developers.pipedrive.com/docs/api/v1/Persons
        const proxyConfig = {
            endpoint: '/v1/persons',
            params: {
                sort_by: 'update_time',
                sort_direction: 'asc',
                ...(updatedAfter && { updated_since: updatedAfter })
            },
            paginate: { limit: 100 },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const providerPersons = page
                .map((item: unknown) => {
                    const parsed = ProviderPersonSchema.safeParse(item);
                    return parsed.success ? parsed.data : null;
                })
                .filter((item): item is ProviderPerson => item !== null);

            if (providerPersons.length === 0) {
                continue;
            }

            const persons = providerPersons.map((person) => ({
                id: String(person.id),
                name: person.name,
                ...(person.emails && { emails: person.emails }),
                ...(person.phones && { phones: person.phones }),
                ...(person.org_id != null && { org_id: person.org_id }),
                ...(person.owner_id != null && { owner_id: person.owner_id }),
                ...(person.add_time != null && { add_time: person.add_time }),
                update_time: person.update_time
            }));

            await nango.batchSave(persons, 'Person');

            const lastPerson = providerPersons[providerPersons.length - 1];
            if (lastPerson) {
                await nango.saveCheckpoint({
                    updated_after: lastPerson.update_time
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
