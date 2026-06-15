import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    form_link_names: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    current_form_link_name: z.string(),
    current_s_index: z.number().int().positive(),
    updated_after_by_form_json: z.string()
});

const FormRecordSchema = z.object({
    id: z.string(),
    form_link_name: z.string(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const GetRecordsResponseSchema = z.object({
    response: z.object({
        result: z.array(z.record(z.string(), z.unknown())).optional(),
        message: z.string().optional(),
        status: z.number(),
        errors: z
            .object({
                code: z.union([z.string(), z.number()]).optional(),
                message: z.string().optional()
            })
            .optional()
    })
});

const EntrySchema = z.record(z.string(), z.array(z.record(z.string(), z.unknown())));

const DEFAULT_FORM_LINK_NAMES = ['employee', 'department', 'designation', 'leave', 'travelrequest', 'exitinterview'];
const PAGE_SIZE = 200;

const MONTH_MAP: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11
};

function parseZohoDate(dateStr: string): Date {
    const match = dateStr.match(/^([0-9]{1,2})-([A-Za-z]{3})-([0-9]{4})(?:\s+([0-9]{2}):([0-9]{2}):([0-9]{2}))?$/);
    if (!match || !match[1] || !match[2] || !match[3]) {
        return new Date(0);
    }
    const day = parseInt(match[1], 10);
    const monthStr = match[2];
    const year = parseInt(match[3], 10);
    const month = MONTH_MAP[monthStr];
    if (month === undefined) {
        return new Date(0);
    }
    const hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(year, month, day, hours, minutes, seconds);
}

function formatZohoDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function parseTimestampToZohoDate(value: unknown): string | undefined {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return undefined;
    }
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
        return undefined;
    }
    const date = new Date(num);
    return formatZohoDate(date);
}

function parseFormRecords(
    result: Array<Record<string, unknown>>,
    formLinkName: string
): Array<{ id: string; form_link_name: string; fields: Record<string, unknown> }> {
    const records: Array<{ id: string; form_link_name: string; fields: Record<string, unknown> }> = [];

    for (const entry of result) {
        const parsedEntry = EntrySchema.safeParse(entry);
        if (!parsedEntry.success) {
            continue;
        }

        const entryEntries = Object.entries(parsedEntry.data);
        if (entryEntries.length === 0) {
            continue;
        }

        const firstEntry = entryEntries[0];
        if (firstEntry === undefined) {
            continue;
        }

        const [recordId, fieldsArray] = firstEntry;
        if (fieldsArray.length === 0) {
            continue;
        }

        const firstFields = fieldsArray[0];
        if (firstFields === undefined) {
            continue;
        }

        records.push({
            id: recordId,
            form_link_name: formLinkName,
            fields: firstFields
        });
    }

    return records;
}

function computeMaxModifiedtime(
    records: Array<{ id: string; form_link_name: string; fields: Record<string, unknown> }>,
    currentMax: string | undefined
): string | undefined {
    return records.reduce((max: string | undefined, record) => {
        const modifiedtime = parseTimestampToZohoDate(record.fields['ModifiedTime']);
        if (modifiedtime === undefined) {
            return max;
        }
        const currentDate = max ? parseZohoDate(max) : undefined;
        const recordDate = parseZohoDate(modifiedtime);
        if (currentDate === undefined || recordDate > currentDate) {
            return modifiedtime;
        }
        return max;
    }, currentMax);
}

type ProviderResponse = z.infer<typeof GetRecordsResponseSchema>['response'];

function isNoRecordsResponse(response: ProviderResponse): boolean {
    const message = response.errors?.message ?? response.message ?? '';
    const code = response.errors?.code;

    return response.status === 1 && (message.includes('No records found') || message.includes('7024') || code === 7024 || code === '7024');
}

function getProviderErrorMessage(response: ProviderResponse): string {
    return response.errors?.message ?? response.message ?? 'Unknown error';
}

function parseUpdatedAfterByForm(value: string): Record<string, string> {
    if (!value) {
        return {};
    }

    try {
        const parsed = z.record(z.string(), z.string()).safeParse(JSON.parse(value));
        return parsed.success ? parsed.data : {};
    } catch {
        return {};
    }
}

async function saveFormRecordsCheckpoint(
    nango: { saveCheckpoint: (checkpoint: z.infer<typeof CheckpointSchema>) => Promise<void> },
    currentFormLinkName: string,
    currentSIndex: number,
    updatedAfterByForm: Record<string, string>
): Promise<void> {
    await nango.saveCheckpoint({
        current_form_link_name: currentFormLinkName,
        current_s_index: currentSIndex,
        updated_after_by_form_json: JSON.stringify(updatedAfterByForm)
    });
}

const sync = createSync({
    description: 'Sync records for a configurable set of forms',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        FormRecord: FormRecordSchema
    },
    endpoints: [
        {
            path: '/syncs/form-records',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        let metadata: unknown = {};
        try {
            metadata = await nango.getMetadata();
        } catch {
            metadata = {};
        }
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        const safeMetadata = parsedMetadata.success ? parsedMetadata.data : {};

        const formLinkNames = safeMetadata.form_link_names ?? DEFAULT_FORM_LINK_NAMES;
        if (formLinkNames.length === 0) {
            return;
        }

        const parsedCheckpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const safeCheckpoint = parsedCheckpoint.success
            ? parsedCheckpoint.data
            : {
                  current_form_link_name: '',
                  current_s_index: 1,
                  updated_after_by_form_json: '{}'
              };
        const updatedAfterByForm = parseUpdatedAfterByForm(safeCheckpoint.updated_after_by_form_json);

        const discoveredForms: Array<{ formLinkName: string; supportsModifiedtime: boolean }> = [];

        for (const formLinkName of formLinkNames) {
            // Probe each configured form on every run so new data can opt into
            // modifiedtime filtering once the form starts returning records.
            const discoveryResponse = await nango.get({
                // https://www.zoho.com/people/api/overview.html
                endpoint: `/people/api/forms/${encodeURIComponent(formLinkName)}/getRecords`,
                params: {
                    sIndex: '1',
                    limit: '1'
                },
                retries: 3
            });

            const parsed = GetRecordsResponseSchema.safeParse(discoveryResponse.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse discovery response for form ${formLinkName}`);
            }

            const providerResponse = parsed.data.response;
            if (isNoRecordsResponse(providerResponse)) {
                discoveredForms.push({ formLinkName, supportsModifiedtime: false });
                continue;
            }

            if (providerResponse.status !== 0) {
                throw new Error(`Zoho API error for form ${formLinkName}: ${getProviderErrorMessage(providerResponse)}`);
            }

            const records = parseFormRecords(providerResponse.result ?? [], formLinkName);
            const firstRecord = records[0];
            const supportsModifiedtime = firstRecord !== undefined && firstRecord.fields['ModifiedTime'] !== undefined;
            discoveredForms.push({ formLinkName, supportsModifiedtime });
        }

        const hasIncrementalForms = discoveredForms.some((form) => form.supportsModifiedtime);
        const hasFullRefreshForms = discoveredForms.some((f) => !f.supportsModifiedtime);
        const canTrackDeletes = hasFullRefreshForms && !hasIncrementalForms;

        // Automatic delete tracking is only safe when every configured form is
        // fetched as a full snapshot in the same run.
        if (canTrackDeletes) {
            await nango.trackDeletesStart('FormRecord');
        }

        const checkpointFormLinkName = safeCheckpoint.current_form_link_name;
        const checkpointStartIndex = safeCheckpoint.current_s_index;

        for (let formIndex = 0; formIndex < discoveredForms.length; formIndex++) {
            const discoveredForm = discoveredForms[formIndex];
            if (!discoveredForm) {
                continue;
            }

            const { formLinkName, supportsModifiedtime } = discoveredForm;
            const updatedAfter = updatedAfterByForm[formLinkName];
            const shouldResumePage = checkpointFormLinkName === formLinkName && (supportsModifiedtime || !canTrackDeletes);
            let sIndex = shouldResumePage ? checkpointStartIndex : 1;

            if (supportsModifiedtime) {
                let maxModifiedtime: string | undefined = updatedAfter;

                while (true) {
                    const response = await nango.get({
                        // https://www.zoho.com/people/api/overview.html
                        endpoint: `/people/api/forms/${encodeURIComponent(formLinkName)}/getRecords`,
                        params: {
                            sIndex: String(sIndex),
                            limit: String(PAGE_SIZE),
                            ...(updatedAfter ? { modifiedtime: updatedAfter } : {})
                        },
                        retries: 3
                    });

                    const parsed = GetRecordsResponseSchema.safeParse(response.data);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse response for form ${formLinkName}`);
                    }

                    const providerResponse = parsed.data.response;
                    if (isNoRecordsResponse(providerResponse)) {
                        break;
                    }

                    if (providerResponse.status !== 0) {
                        throw new Error(`Zoho API error for form ${formLinkName}: ${getProviderErrorMessage(providerResponse)}`);
                    }

                    const result = providerResponse.result ?? [];
                    if (result.length === 0) {
                        break;
                    }

                    const records = parseFormRecords(result, formLinkName);
                    if (records.length > 0) {
                        await nango.batchSave(records, 'FormRecord');
                        maxModifiedtime = computeMaxModifiedtime(records, maxModifiedtime);
                    }

                    sIndex += result.length;
                    await saveFormRecordsCheckpoint(nango, formLinkName, sIndex, {
                        ...updatedAfterByForm,
                        ...(maxModifiedtime !== undefined ? { [formLinkName]: maxModifiedtime } : {})
                    });

                    if (result.length < PAGE_SIZE) {
                        break;
                    }
                }

                if (maxModifiedtime !== undefined) {
                    updatedAfterByForm[formLinkName] = maxModifiedtime;
                }
            } else {
                while (true) {
                    const response = await nango.get({
                        // https://www.zoho.com/people/api/overview.html
                        endpoint: `/people/api/forms/${encodeURIComponent(formLinkName)}/getRecords`,
                        params: {
                            sIndex: String(sIndex),
                            limit: String(PAGE_SIZE)
                        },
                        retries: 3
                    });

                    const parsed = GetRecordsResponseSchema.safeParse(response.data);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse response for form ${formLinkName}`);
                    }

                    const providerResponse = parsed.data.response;
                    if (isNoRecordsResponse(providerResponse)) {
                        break;
                    }

                    if (providerResponse.status !== 0) {
                        throw new Error(`Zoho API error for form ${formLinkName}: ${getProviderErrorMessage(providerResponse)}`);
                    }

                    const result = providerResponse.result ?? [];
                    if (result.length === 0) {
                        break;
                    }

                    const records = parseFormRecords(result, formLinkName);
                    if (records.length > 0) {
                        await nango.batchSave(records, 'FormRecord');
                    }

                    sIndex += result.length;
                    await saveFormRecordsCheckpoint(nango, formLinkName, sIndex, updatedAfterByForm);

                    if (result.length < PAGE_SIZE) {
                        break;
                    }
                }
            }

            const nextFormLinkName = discoveredForms[formIndex + 1]?.formLinkName ?? discoveredForms[0]?.formLinkName ?? '';
            await saveFormRecordsCheckpoint(nango, nextFormLinkName, 1, updatedAfterByForm);
        }

        if (canTrackDeletes) {
            await nango.trackDeletesEnd('FormRecord');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
