import { createSync } from 'nango';
import { z } from 'zod';

const MixpanelEventSchema = z.object({
    event: z.string(),
    properties: z.object({}).passthrough()
});

const EventSchema = z.object({
    id: z.string(),
    event: z.string(),
    time: z.number(),
    distinct_id: z.string().optional(),
    insert_id: z.string().optional(),
    properties: z.object({}).passthrough().optional()
});

const MeResponseSchema = z.object({
    status: z.string(),
    results: z.object({
        projects: z.record(
            z.string(),
            z.object({
                name: z.string(),
                domain: z.string().optional()
            })
        )
    })
});

const CheckpointSchema = z.object({
    from_date: z.string()
});

const MetadataSchema = z.object({
    project_id: z.string().optional(),
    data_host: z.string().optional()
});

function formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDefaultFromDate(): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    return formatDate(d);
}

function getNextDate(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
        throw new Error(`Invalid date format: ${dateStr}`);
    }
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + 1);
    return formatDate(d);
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getResponseData(error: unknown): unknown {
    if (!isObject(error)) {
        return undefined;
    }
    if (!('response' in error)) {
        return undefined;
    }
    const response = error['response'];
    if (!isObject(response)) {
        return undefined;
    }
    if (!('data' in response)) {
        return undefined;
    }
    return response['data'];
}

const sync = createSync({
    description: 'Sync events.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const metadataRaw = await nango.getMetadata();

        const checkpointParse = CheckpointSchema.safeParse(checkpointRaw);
        const today = formatDate(new Date());
        const checkpointFromDate = checkpointParse.success ? checkpointParse.data['from_date'] : undefined;
        const fromDate = checkpointFromDate ? (checkpointFromDate > today ? today : checkpointFromDate) : getDefaultFromDate();

        const metadataParse = MetadataSchema.safeParse(metadataRaw);
        const metadata = metadataParse.success ? metadataParse.data : {};

        let projectId: string;
        const metadataProjectId = metadata['project_id'];
        if (typeof metadataProjectId === 'string' && metadataProjectId.length > 0) {
            projectId = metadataProjectId;
        } else {
            // https://developer.mixpanel.com/reference/me
            const meResponse = await nango.get({
                endpoint: '/api/app/me',
                retries: 3
            });

            const meValidation = MeResponseSchema.safeParse(meResponse.data);
            if (!meValidation.success) {
                throw new Error('Failed to parse Mixpanel /api/app/me response');
            }

            const projects = meValidation.data.results.projects;
            const projectIds = Object.keys(projects);
            if (projectIds.length === 0) {
                throw new Error('No Mixpanel projects found for this connection');
            }

            if (projectIds.length > 1) {
                throw new Error('Multiple Mixpanel projects found. Please set project_id in metadata.');
            }

            const firstProjectId = projectIds[0];
            if (typeof firstProjectId !== 'string') {
                throw new Error('No Mixpanel projects found for this connection');
            }

            projectId = firstProjectId;
        }

        const dataHost = metadata['data_host'] ?? 'https://data.mixpanel.com';

        let currentFromDate = fromDate;
        while (currentFromDate <= today) {
            const toDate = currentFromDate;

            let exportResponse;
            // @allowTryCatch Mixpanel Raw Export API may return auth errors for service accounts lacking export permissions; we catch this to end the run safely without false deletions.
            try {
                // https://developer.mixpanel.com/reference/raw-event-export
                exportResponse = await nango.get({
                    baseUrlOverride: dataHost,
                    endpoint: '/api/2.0/export',
                    params: {
                        project_id: projectId,
                        from_date: currentFromDate,
                        to_date: toDate
                    },
                    retries: 3
                });
            } catch (error) {
                const responseData = getResponseData(error);
                const responseText = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
                if (responseText.includes('Unable to authenticate') || responseText.includes('not a member of this project')) {
                    await nango.log(`Mixpanel export API unavailable for this connection: ${responseText}`);
                    return;
                }
                throw error;
            }

            const responseStatus = isObject(exportResponse) && 'status' in exportResponse ? exportResponse['status'] : undefined;
            if (typeof responseStatus === 'number' && responseStatus >= 400) {
                const responseData = isObject(exportResponse) && 'data' in exportResponse ? exportResponse['data'] : undefined;
                const responseText = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
                if (responseText.includes('Unable to authenticate') || responseText.includes('not a member of this project')) {
                    await nango.log(`Mixpanel export API unavailable for this connection: ${responseText}`);
                    return;
                }
                throw new Error(`Mixpanel export API returned status ${responseStatus}: ${responseText}`);
            }

            if (typeof exportResponse.data !== 'string') {
                throw new Error('Expected text response from Mixpanel export API');
            }

            const lines = exportResponse.data.split('\n').filter((line) => line.trim().length > 0);
            const events: Array<z.infer<typeof EventSchema>> = [];

            for (const line of lines) {
                let parsed: unknown;
                // @allowTryCatch We catch JSON.parse failures to produce a descriptive error that includes the offending JSONL line.
                try {
                    parsed = JSON.parse(line);
                } catch {
                    throw new Error(`Failed to parse JSONL line: ${line}`);
                }

                const validation = MixpanelEventSchema.safeParse(parsed);
                if (!validation.success) {
                    throw new Error(`Invalid event shape: ${line}`);
                }

                const rawEvent = validation.data;
                const properties = rawEvent.properties;
                const time = typeof properties['time'] === 'number' ? properties['time'] : undefined;
                const distinctId = typeof properties['$distinct_id'] === 'string' ? properties['$distinct_id'] : undefined;
                const insertId = typeof properties['$insert_id'] === 'string' ? properties['$insert_id'] : undefined;

                if (time === undefined) {
                    throw new Error(`Event missing time property: ${line}`);
                }

                const id = insertId ?? `${rawEvent.event}-${time}-${distinctId ?? 'unknown'}`;

                events.push({
                    id,
                    event: rawEvent.event,
                    time,
                    ...(distinctId && { distinct_id: distinctId }),
                    ...(insertId && { insert_id: insertId }),
                    properties: rawEvent.properties
                });
            }

            if (events.length > 0) {
                await nango.batchSave(events, 'Event');
            }

            const nextDate = getNextDate(currentFromDate);
            await nango.saveCheckpoint({ from_date: currentFromDate === today ? today : nextDate });
            currentFromDate = nextDate;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
