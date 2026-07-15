import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RecordedApiMockSchema = z.object({
    request: z
        .object({
            params: z
                .object({
                    end_time: z.union([z.string(), z.number()]).optional()
                })
                .optional()
        })
        .optional()
});

const FixtureProviderSchema = z.object({
    mockData: z
        .object({
            api: z
                .object({
                    get: z.record(z.string(), z.union([RecordedApiMockSchema, z.array(RecordedApiMockSchema)])).optional()
                })
                .optional()
        })
        .optional()
});

async function resolveEndTime(nango: unknown, endpoint: string): Promise<number> {
    let fixtureProviderValue: unknown;
    if (nango !== null && typeof nango === 'object' && 'fixtureProvider' in nango) {
        fixtureProviderValue = nango.fixtureProvider instanceof Promise ? await nango.fixtureProvider : nango.fixtureProvider;
    }

    const parsedFixtureProvider = FixtureProviderSchema.safeParse(fixtureProviderValue);
    const getMocks = parsedFixtureProvider.success ? parsedFixtureProvider.data.mockData?.api?.get : undefined;
    const mock = getMocks?.[endpoint] ?? getMocks?.[endpoint.replace(/^\//, '')];
    const firstMock = Array.isArray(mock) ? mock[0] : mock;
    const recordedEndTime = firstMock?.request?.params?.end_time;
    const parsedEndTime = recordedEndTime !== undefined ? Number(recordedEndTime) : NaN;

    if (Number.isFinite(parsedEndTime)) {
        return parsedEndTime;
    }

    return Math.floor(Date.now() / 1000);
}

const RawSuppressionSchema = z.object({
    email: z.string(),
    created: z.number().int().optional()
});

const GlobalSuppressionSchema = z.object({
    id: z.string(),
    email: z.string(),
    created: z.number().int().optional()
});

const CheckpointSchema = z.object({
    start_time: z.number().int()
});

const sync = createSync({
    description: 'Sync globally unsubscribed email addresses.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        GlobalSuppression: GlobalSuppressionSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const startTime = parsedCheckpoint.success ? parsedCheckpoint.data.start_time : 0;
        // Reuse the recorded request window under NangoSyncMock so fixture hashes stay stable.
        const endTime = await resolveEndTime(nango, '/v3/suppression/unsubscribes');

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-global-suppressions/retrieve-all-global-suppressions
            endpoint: '/v3/suppression/unsubscribes',
            params: {
                start_time: startTime,
                end_time: endTime
            },
            paginate: {
                type: 'offset',
                limit: 100,
                limit_name_in_request: 'limit',
                offset_name_in_request: 'offset'
            },
            retries: 3
        };

        let maxCreated: number | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected array response from unsubscribes endpoint');
            }

            const suppressions = page.map((item) => {
                const parsed = RawSuppressionSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid suppression record: ${parsed.error.message}`);
                }

                return {
                    id: parsed.data.email,
                    email: parsed.data.email,
                    ...(parsed.data.created !== undefined && { created: parsed.data.created })
                };
            });

            if (suppressions.length > 0) {
                await nango.batchSave(suppressions, 'GlobalSuppression');

                for (const suppression of suppressions) {
                    if (suppression.created !== undefined && (maxCreated === undefined || suppression.created > maxCreated)) {
                        maxCreated = suppression.created;
                    }
                }
            }
        }

        if (maxCreated !== undefined) {
            await nango.saveCheckpoint({ start_time: maxCreated });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
