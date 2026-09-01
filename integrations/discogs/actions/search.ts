import { createAction, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    query: z.string().optional(),
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
    credit: z.string().optional(),
    anv: z.string().optional(),
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

function parseCursor(cursor: string): number {
    if (!/^\d+$/.test(cursor)) {
        throw new Error('Invalid cursor: must be a positive integer string');
    }
    const page = Number(cursor);
    if (!Number.isSafeInteger(page) || page <= 0) {
        throw new Error('Invalid cursor: must be a positive integer string');
    }
    return page;
}

const action = createAction({
    description: 'Search the Discogs database.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/search', group: 'Database' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const page = input.cursor ? parseCursor(input.cursor) : 1;
        const perPage = input.per_page ?? 50;

        const params: Record<string, string | number> = {
            page,
            per_page: perPage
        };

        if (input.query) params['q'] = input.query;
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
        if (input.credit) params['credit'] = input.credit;
        if (input.anv) params['anv'] = input.anv;

        const hasSearchCriteria =
            Boolean(input.query) ||
            input.type !== undefined ||
            Boolean(input.title) ||
            Boolean(input.release_title) ||
            Boolean(input.credit) ||
            Boolean(input.artist) ||
            Boolean(input.anv) ||
            Boolean(input.label) ||
            Boolean(input.genre) ||
            Boolean(input.style) ||
            Boolean(input.country) ||
            Boolean(input.year) ||
            Boolean(input.format) ||
            Boolean(input.catno) ||
            Boolean(input.barcode) ||
            Boolean(input.track) ||
            Boolean(input.submitter) ||
            Boolean(input.contributor);

        if (!hasSearchCriteria) {
            throw new Error(
                'At least one search criterion is required: provide a non-empty query or at least one filter (type, title, release_title, credit, artist, anv, label, genre, style, country, year, format, catno, barcode, track, submitter, contributor).'
            );
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.discogs.com/developers#page:database,header-database-search
            endpoint: '/database/search',
            params,
            retries: 3
        };

        const response = await nango.get(proxyConfig);
        const data = z
            .object({
                results: z.array(z.record(z.string(), z.unknown())),
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

        const pagination = data.pagination;
        const next_cursor = pagination && pagination.page < pagination.pages ? String(pagination.page + 1) : undefined;

        return {
            results: data.results,
            ...(pagination !== undefined && { pagination }),
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
