import { createSync } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const CheckpointSchema = z.object({
    owned_page: z.number().int().positive().describe('Current page of /api/2/attributes/owned/ being processed during a resumable full refresh.'),
    resume_attribute_name: z
        .string()
        .describe(
            'Name of the currently-owned attribute to resume at on the current owned_page: fresh (not yet started) if values_page is 1, mid-history otherwise; empty string to resume from the start of the page.'
        ),
    values_page: z.number().int().positive().describe('Current page of /api/2/attributes/values/ to request for the resumed attribute.')
});

const OwnedAttributeSchema = z.object({
    name: z.string()
});

const OwnedAttributesPageSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(OwnedAttributeSchema)
});

const ProviderValueSchema = z.object({
    date: z.string(),
    value: z.union([z.number(), z.string(), z.boolean()]).nullable()
});

const ProviderValuesPageSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(ProviderValueSchema)
});

const ErrorStatusSchema = z.object({
    status: z.number().optional(),
    statusCode: z.number().optional(),
    response: z
        .object({
            status: z.number().optional(),
            statusCode: z.number().optional()
        })
        .optional()
});

const AttributeValueSchema = z
    .object({
        id: z.string().describe('Unique record id built as "<attribute>:<date>", e.g. "steps:2026-10-07".'),
        attribute: z.string().describe('Name of the currently-owned Exist attribute this value belongs to, e.g. "steps".'),
        date: z.string().describe('Calendar date the value applies to, in YYYY-MM-DD format, e.g. "2026-10-07".'),
        value: z
            .union([z.number(), z.string(), z.boolean()])
            .nullable()
            .describe(
                'Value recorded for the date: number for Integer/Float/scale/period attributes, string for text attributes, 1/0 for boolean tags, or null when no value was recorded.'
            )
    })
    .describe('A single daily value for one currently-owned Exist attribute.');

const sync = createSync({
    description: 'Sync the full value history for every currently-owned (active) Exist attribute.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        AttributeValue: AttributeValueSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let ownedPage = getCheckpointNumber(checkpoint, 'owned_page') ?? 1;
        let resumeAttributeName = getCheckpointString(checkpoint, 'resume_attribute_name') ?? '';
        let valuesPage = getCheckpointNumber(checkpoint, 'values_page') ?? 1;

        // Full refresh is required: GET /api/2/attributes/values/ exposes only an upper-bound
        // `date_max` filter (no `date_min`/changed-since filter) and returns no per-value
        // `modified` timestamp, so no incremental checkpoint can reduce the work or detect
        // in-place overwrites. The checkpoint only resumes page-by-page progress within that
        // full crawl; every completed run still re-reads the full history for each currently-owned
        // attribute and re-upserts records by their stable "<attribute>:<date>" id.
        //
        // Deletion tracking is intentionally NOT used: when an attribute is released its values
        // endpoint returns 404 but its history is not actually deleted, so it must be skipped for
        // this run (it may be re-acquired later) rather than treated as removed.

        while (true) {
            const ownedResponse = await nango.get({
                // https://developer.exist.io/reference/attribute_ownership/#list-owned-attributes
                endpoint: '/api/2/attributes/owned/',
                params: {
                    page: ownedPage,
                    limit: LIMIT
                },
                retries: 3
            });
            const ownedAttributesPage = OwnedAttributesPageSchema.parse(ownedResponse.data);

            if (ownedAttributesPage.results.length === 0) {
                break;
            }

            // Resume by the attribute's stable name rather than its numeric position: ownership can
            // change between interrupted runs (an attribute released since the checkpoint was saved
            // shifts every later index on this page), so resuming at a saved index can silently skip
            // an attribute. If the saved name is no longer on this page, restart the page from the
            // beginning instead of guessing a position; attributes already synced this run are
            // re-upserted by their stable id, so this is wasted work, never lost data.
            let startIndex = 0;
            if (resumeAttributeName !== '') {
                const resumeIndex = ownedAttributesPage.results.findIndex((candidate) => candidate.name === resumeAttributeName);
                if (resumeIndex === -1) {
                    // The saved values_page belonged to the vanished attribute, not to whichever
                    // attribute now sits at index 0, so that one must start from its first page.
                    startIndex = 0;
                    valuesPage = 1;
                } else {
                    startIndex = resumeIndex;
                }
            }

            for (let index = startIndex; index < ownedAttributesPage.results.length; index++) {
                const attributeName = ownedAttributesPage.results[index]?.name;
                if (!attributeName) {
                    continue;
                }

                let currentValuesPage = index === startIndex ? valuesPage : 1;

                while (true) {
                    let providerValuesPage: z.infer<typeof ProviderValuesPageSchema>;

                    // @allowTryCatch: an attribute released between the owned listing and this call
                    // returns 404; skip it this run instead of failing the whole sync.
                    try {
                        const valuesResponse = await nango.get({
                            // https://developer.exist.io/reference/attributes/#get-a-specific-attribute
                            endpoint: '/api/2/attributes/values/',
                            params: {
                                attribute: attributeName,
                                page: currentValuesPage,
                                limit: LIMIT
                            },
                            retries: 3
                        });
                        providerValuesPage = ProviderValuesPageSchema.parse(valuesResponse.data);
                    } catch (error) {
                        if (isNotFoundError(error)) {
                            await nango.log(`Skipping attribute "${attributeName}": no longer owned (values endpoint returned 404).`, { level: 'warn' });
                            break;
                        }
                        throw error;
                    }

                    const records = providerValuesPage.results.map((item) => ({
                        id: `${attributeName}:${item.date}`,
                        attribute: attributeName,
                        date: item.date,
                        value: item.value
                    }));

                    if (records.length > 0) {
                        await nango.batchSave(records, 'AttributeValue');
                    }

                    if (providerValuesPage.next == null) {
                        break;
                    }

                    currentValuesPage += 1;
                    await nango.saveCheckpoint({
                        owned_page: ownedPage,
                        resume_attribute_name: attributeName,
                        values_page: currentValuesPage
                    });
                }

                const nextAttribute = ownedAttributesPage.results[index + 1];
                resumeAttributeName = nextAttribute ? nextAttribute.name : '';
                valuesPage = 1;
                await nango.saveCheckpoint({
                    owned_page: ownedPage,
                    resume_attribute_name: resumeAttributeName,
                    values_page: valuesPage
                });
            }

            if (ownedAttributesPage.next == null) {
                break;
            }

            ownedPage += 1;
            resumeAttributeName = '';
            valuesPage = 1;
            await nango.saveCheckpoint({
                owned_page: ownedPage,
                resume_attribute_name: resumeAttributeName,
                values_page: valuesPage
            });
        }

        await nango.clearCheckpoint();
    }
});

function isNotFoundError(error: unknown): boolean {
    const parsed = ErrorStatusSchema.safeParse(error);
    if (!parsed.success) {
        return false;
    }
    const { status, statusCode, response } = parsed.data;
    return status === 404 || statusCode === 404 || response?.status === 404 || response?.statusCode === 404;
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];

function getCheckpointNumber(checkpoint: unknown, key: string): number | undefined {
    if (typeof checkpoint !== 'object' || checkpoint === null) {
        return undefined;
    }

    const value = Reflect.get(checkpoint, key);
    return typeof value === 'number' ? value : undefined;
}

function getCheckpointString(checkpoint: unknown, key: string): string | undefined {
    if (typeof checkpoint !== 'object' || checkpoint === null) {
        return undefined;
    }

    const value = Reflect.get(checkpoint, key);
    return typeof value === 'string' ? value : undefined;
}

export default sync;
