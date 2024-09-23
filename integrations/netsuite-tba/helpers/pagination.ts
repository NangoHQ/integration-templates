import type { NangoSync, ProxyConfiguration } from '../../models';

export async function* paginate<TResult>({
    nango,
    proxyConfig,
    limit = 100
}: {
    nango: NangoSync;
    proxyConfig: ProxyConfiguration;
    limit?: number;
}): AsyncGenerator<TResult[]> {
    const config: ProxyConfiguration =
        typeof proxyConfig.params === 'string' ? { ...proxyConfig, params: { limit } } : { ...proxyConfig, params: { ...proxyConfig.params, limit } };
    // eslint-disable-next-line @nangohq/nango-custom-integrations-linting/no-while-true
    while (true) {
        const res = await nango.get({ retries: 10 });
        yield res.data?.items || [];

        if (res.data?.hasMore) {
            const next = res.data?.links?.find((link: { rel: string; href: string }) => link.rel === 'next')?.href;
            if (!next) break;
            const offset = next.match(/offset=(\d+)/)?.[1];
            if (!offset) break;
            config.params = { limit, offset };
        } else {
            break;
        }
    }
}
