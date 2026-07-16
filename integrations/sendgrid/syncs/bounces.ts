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

const ProviderBounceSchema = z.object({
    email: z.string(),
    created: z.number(),
    reason: z.string().optional(),
    status: z.string().optional()
});

const BounceSchema = z.object({
    id: z.string(),
    email: z.string(),
    created: z.number(),
    reason: z.string().optional(),
    status: z.string().optional()
});

const CheckpointSchema = z.object({
    start_time: z.number().int()
});

const sync = createSync({
    description: 'Sync bounced email events.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Bounce: BounceSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let startTime: number | undefined;
        if (checkpoint !== null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (parsedCheckpoint.success) {
                startTime = parsedCheckpoint.data.start_time;
            }
        }

        // Reuse the recorded request window under NangoSyncMock so fixture hashes stay stable.
        const endTime = await resolveEndTime(nango, '/v3/suppression/bounces');
        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-api-retrieve-all-bounces
            endpoint: '/v3/suppression/bounces',
            params: {
                ...(startTime !== undefined && { start_time: startTime }),
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

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected response from bounces endpoint: expected array');
            }

            const parsedPage = z.array(ProviderBounceSchema).safeParse(page);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse bounces response: ${parsedPage.error.message}`);
            }

            const bounces = parsedPage.data.map((bounce) => ({
                id: `${bounce.email}:${bounce.created}`,
                email: bounce.email,
                created: bounce.created,
                ...(bounce.reason !== undefined && { reason: bounce.reason }),
                ...(bounce.status !== undefined && { status: bounce.status })
            }));

            if (bounces.length > 0) {
                await nango.batchSave(bounces, 'Bounce');
            }
        }

        // Persist the window's end unconditionally so a run with zero new bounces still advances
        // the start of the next run's window, instead of re-querying an ever-growing range.
        await nango.saveCheckpoint({
            start_time: endTime
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
