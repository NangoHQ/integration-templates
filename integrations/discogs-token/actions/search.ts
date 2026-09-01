import { createAction, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    query: z.string(),
    type: z.enum(['release', 'master', 'artist', 'label']).optional(),
    title: z.string().optional(),
    release_title: z.string().optional(),
    artist: z.string().optional(),
    label: z.string().optional(),
    genre: z.string().optional(),
    style: z.string().optional(),
    country: z.string().optional(),
    year: z.string().optional(),
    format: z.string().optional(),
    catno: z.string().optional(),
    barcode: z.string().optional(),
    track: z.string().optional(),
    submitter: z.string().optional(),
    contributor: z.string().optional(),
    cursor: z.string().optional(),
    per_page: z.number().int().min(1).max(100).optional()
});

const OutputSchema = z.object({
    results: z.array(z.record(z.string(), z.unknown())),
    pagination: z
        .object({
            page: z.number(),
            pages: z.number(),
            per_page: z.number(),
            items: z.number()
        })
        .optional(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'Search the Discogs database.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/search', group: 'Database' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const page = input.cursor ? Number(input.cursor) : 1;
        const perPage = input.per_page ?? 50;

        const params: Record<string, string | number> = {
            q: input.query,
            page,
            per_page: perPage
        };

        if (input.type) params['type'] = input.type;
        if (input.title) params['title'] = input.title;
        if (input.release_title) params['release_title'] = input.release_title;
        if (input.artist) params['artist'] = input.artist;
        if (input.label) params['label'] = input.label;
        if (input.genre) params['genre'] = input.genre;
        if (input.style) params['style'] = input.style;
        if (input.country) params['country'] = input.country;
        if (input.year) params['year'] = input.year;
        if (input.format) params['format'] = input.format;
        if (input.catno) params['catno'] = input.catno;
        if (input.barcode) params['barcode'] = input.barcode;
        if (input.track) params['track'] = input.track;
        if (input.submitter) params['submitter'] = input.submitter;
        if (input.contributor) params['contributor'] = input.contributor;

        const proxyConfig: ProxyConfiguration = {
            // https://www.discogs.com/developers#page:database,header-database-search
            endpoint: '/database/search',
            params,
            retries: 3
        };

        const response = await nango.get(proxyConfig);
        const data = z
            .object({
                results: z.array(z.record(z.string(), z.unknown())).optional(),
                pagination: z
                    .object({
                        page: z.number(),
                        pages: z.number(),
                        per_page: z.number(),
                        items: z.number()
                    })
                    .optional()
            })
            .parse(response.data);

        const results = data.results ?? [];
        const pagination = data.pagination;
        const next_cursor = pagination && pagination.page < pagination.pages ? String(pagination.page + 1) : undefined;

        return {
            results,
            ...(pagination !== undefined && { pagination }),
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
