import { createSync } from 'nango';
import unzipper from 'unzipper';
import { z } from 'zod';

const RawEventSchema = z.object({
    amplitude_id: z.number().optional(),
    user_id: z.string().optional(),
    device_id: z.string().optional(),
    event_type: z.string().optional(),
    time: z.number().optional(),
    server_upload_time: z.number().optional(),
    event_id: z.number().optional(),
    insert_id: z.string().optional(),
    session_id: z.number().optional(),
    uuid: z.string().optional()
});

const EventExportSchema = z.object({
    id: z.string(),
    amplitude_id: z.number().optional(),
    user_id: z.string().optional(),
    device_id: z.string().optional(),
    event_type: z.string().optional(),
    time: z.number().optional(),
    server_upload_time: z.number().optional(),
    event_id: z.number().optional(),
    insert_id: z.string().optional(),
    session_id: z.number().optional(),
    uuid: z.string().optional()
});

const CheckpointSchema = z.object({
    last_hour: z.string()
});

const ConnectionConfigSchema = z.object({
    hostname: z.string().optional()
});

function formatHour(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return `${year}${month}${day}T${hour}`;
}

function parseHour(hourStr: string): Date {
    const year = parseInt(hourStr.slice(0, 4), 10);
    const month = parseInt(hourStr.slice(4, 6), 10) - 1;
    const day = parseInt(hourStr.slice(6, 8), 10);
    const hour = parseInt(hourStr.slice(9, 11), 10);
    return new Date(Date.UTC(year, month, day, hour));
}

function incrementHour(hourStr: string): string {
    const date = parseHour(hourStr);
    date.setUTCMinutes(60);
    return formatHour(date);
}

function getLatestAvailableHour(now: Date): string {
    const date = new Date(now);
    date.setUTCMinutes(0, 0, 0);
    // Export windows can lag by up to two hours, so only advance through hours
    // that should already be available.
    date.setUTCHours(date.getUTCHours() - 3);
    return formatHour(date);
}

function compareHours(left: string, right: string): number {
    return parseHour(left).getTime() - parseHour(right).getTime();
}

function getErrorStatus(error: unknown): number | undefined {
    if (error === null || typeof error !== 'object') {
        return undefined;
    }

    if ('status' in error && typeof error.status === 'number') {
        return error.status;
    }

    if (
        'response' in error &&
        error.response !== null &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        typeof error.response.status === 'number'
    ) {
        return error.response.status;
    }

    return undefined;
}

async function extractRawText(data: unknown): Promise<string> {
    if (data === null || data === undefined) {
        return '';
    }
    if (typeof data === 'string') {
        return data;
    }

    let buffer: Buffer | null = null;

    if (Buffer.isBuffer(data)) {
        buffer = data;
    } else if (data instanceof Uint8Array) {
        buffer = Buffer.from(data);
    } else if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(new Uint8Array(data));
    } else if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'Buffer' && 'data' in data && Array.isArray(data.data)) {
        buffer = Buffer.from(data.data);
    }

    if (!buffer) {
        return '';
    }

    // The export API may return a ZIP archive or already-decompressed text.
    try {
        const directory = await unzipper.Open.buffer(buffer);
        const fileTexts: string[] = [];

        for (const file of directory.files) {
            const fileBuffer = await file.buffer();
            fileTexts.push(fileBuffer.toString('utf-8'));
        }

        if (fileTexts.length > 0) {
            return fileTexts.join('\n');
        }
    } catch {
        // fall through to plain text
    }

    return buffer.toString('utf-8');
}

const sync = createSync({
    description: 'Sync events export.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/events-export'
        }
    ],
    models: {
        EventExport: EventExportSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.safeParse(rawCheckpoint);

        const connection = await nango.getConnection();
        const connectionConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
        const credentials = connection.credentials;
        const apiKey = credentials?.type === 'BASIC' && typeof credentials?.username === 'string' ? credentials.username : '';
        const secretKey = credentials?.type === 'BASIC' && typeof credentials?.password === 'string' ? credentials.password : '';
        const authHeader = apiKey && secretKey ? 'Basic ' + Buffer.from(apiKey + ':' + secretKey).toString('base64') : '';
        const hostname = connectionConfig.success ? (connectionConfig.data.hostname ?? 'amplitude.com') : 'amplitude.com';
        const baseUrlOverride = hostname === 'amplitude.com' ? undefined : `https://${hostname}`;

        const latestAvailableHour = getLatestAvailableHour(new Date());
        const nextHour = checkpoint.success ? incrementHour(checkpoint.data.last_hour) : latestAvailableHour;

        if (compareHours(nextHour, latestAvailableHour) > 0) {
            return;
        }

        let response: { data: unknown; status?: number };
        // @allowTryCatch Amplitude Export API returns 404 when no events exist for the requested hour window.
        try {
            // https://amplitude.com/docs/apis/analytics/export
            response = await nango.get({
                endpoint: '/api/2/export',
                params: {
                    start: nextHour,
                    end: nextHour
                },
                baseUrlOverride,
                responseType: 'arraybuffer',
                ...(authHeader && {
                    headers: {
                        Authorization: authHeader
                    }
                }),
                retries: 3
            });
        } catch (error) {
            if (getErrorStatus(error) === 404) {
                await nango.saveCheckpoint({ last_hour: nextHour });
                return;
            }
            throw error;
        }

        if (response.status === 404) {
            await nango.saveCheckpoint({ last_hour: nextHour });
            return;
        }

        if (typeof response.status === 'number' && response.status !== 200) {
            throw new Error(`Failed to export events for hour ${nextHour}: unexpected status ${response.status}`);
        }

        const rawText = await extractRawText(response.data);
        const lines = rawText.split('\n');
        const events: z.infer<typeof EventExportSchema>[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                continue;
            }

            let parsed: unknown;
            // @allowTryCatch NDJSON lines may contain malformed or partial JSON entries; skip them to avoid crashing the entire sync.
            try {
                parsed = JSON.parse(trimmed);
            } catch {
                continue;
            }

            const validationResult = RawEventSchema.safeParse(parsed);
            if (!validationResult.success) {
                continue;
            }

            const rawEvent = validationResult.data;
            const id =
                rawEvent.insert_id ?? rawEvent.uuid ?? `${rawEvent.amplitude_id ?? 'unknown'}|${rawEvent.event_id ?? 'unknown'}|${rawEvent.time ?? 'unknown'}`;

            events.push({
                id,
                ...(rawEvent.amplitude_id !== undefined && { amplitude_id: rawEvent.amplitude_id }),
                ...(rawEvent.user_id !== undefined && { user_id: rawEvent.user_id }),
                ...(rawEvent.device_id !== undefined && { device_id: rawEvent.device_id }),
                ...(rawEvent.event_type !== undefined && { event_type: rawEvent.event_type }),
                ...(rawEvent.time !== undefined && { time: rawEvent.time }),
                ...(rawEvent.server_upload_time !== undefined && { server_upload_time: rawEvent.server_upload_time }),
                ...(rawEvent.event_id !== undefined && { event_id: rawEvent.event_id }),
                ...(rawEvent.insert_id !== undefined && { insert_id: rawEvent.insert_id }),
                ...(rawEvent.session_id !== undefined && { session_id: rawEvent.session_id }),
                ...(rawEvent.uuid !== undefined && { uuid: rawEvent.uuid })
            });
        }

        if (events.length > 0) {
            await nango.batchSave(events, 'EventExport');
        }

        await nango.saveCheckpoint({ last_hour: nextHour });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
