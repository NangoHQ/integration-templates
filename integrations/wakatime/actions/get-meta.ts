import { z } from 'zod';
import { createAction } from 'nango';

const IpRangeSchema = z.object({
    v4: z.array(z.string()).describe('IPv4 addresses used by this server role. Example: "143.244.180.65"'),
    v6: z.array(z.string()).describe('IPv6 addresses used by this server role. Example: "2604:a880:4:1d0::2a7:b000"')
});

const InputSchema = z.void();

const OutputSchema = z
    .object({
        ips: z
            .object({
                api: IpRangeSchema.describe('IP addresses used by WakaTime API servers.'),
                website: IpRangeSchema.describe('IP addresses used by WakaTime website servers.'),
                worker: IpRangeSchema.describe('IP addresses used by WakaTime background worker servers.')
            })
            .describe('WakaTime server IP ranges grouped by server role.'),
        ip_descriptions: z
            .object({
                api: z.string().describe('Explanation of the API server IP category and how it should be whitelisted.'),
                website: z.string().describe('Explanation of the website server IP category and how it should be whitelisted.'),
                worker: z.string().describe('Explanation of the worker server IP category and how it should be whitelisted.')
            })
            .describe('Human-readable explanation of each IP category.'),
        last_modified_at: z
            .string()
            .describe('ISO 8601 timestamp when an IP was last added, removed, or changed; use like an ETag to sync firewall rules only when the IPs change.')
    })
    .describe("WakaTime's infrastructure metadata: public server IP ranges grouped by server role, their descriptions, and when the IP list last changed.");

/**
 * @tags: [read]
 * @tagReason: Fetches WakaTime's infrastructure metadata (server IP ranges) with a read-only GET and makes no provider changes.
 * @pitfalls: Returns WakaTime's global server IP ranges (not connection- or user-specific data); the lists can change over time, so use last_modified_at to detect changes rather than assuming they are static.
 */
const action = createAction({
    description: 'Get WakaTime infrastructure metadata, including the public IP ranges of its API, website, and worker servers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://wakatime.com/developers#meta
            endpoint: '/api/v1/meta',
            retries: 3
        });

        const body = z.object({ data: OutputSchema }).parse(response.data);

        return body.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
