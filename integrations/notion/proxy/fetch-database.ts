import type { Database as NotionDatabase } from '../types.js';
import { Nango } from '@nangohq/node';

interface RowEntry { id: string; row: Record<string, unknown> };

interface Database {
  id: string;
  title: string;
  path: string;
  last_modified: string;
  meta: {
    created_time: string;
    last_edited_time: string;
  };
  entries: RowEntry[];
};

interface NotionQueryResponse {
  results: { id: string; properties: Record<string, unknown> }[];
  has_more: boolean;
  next_cursor: string | null;
};

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

/**
 * Fetch a Notion database and all of its rows via explicit pagination
 * Tip: run this in your stack through the Nango proxy for large payloads.
 * Docs: https://docs.nango.dev/guides/proxy-requests#proxy-requests
 */
export async function run(input: { databaseId: string }): Promise<Database> {
  const PAGE_SIZE = 100; // Notion max is 100

  const proxyConfig = {
    /* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
    method: 'POST' as const,
    // https://developers.notion.com/reference/post-database-query
    endpoint: `/v1/databases/${input.databaseId}/query`,
    // connectionId: 'your-notion-connection-id',
    // providerConfigKey: 'notion'
  };

  const entries: RowEntry[] = [];
  let startCursor: string | undefined = undefined;

  do {
    const body: Record<string, unknown> = { page_size: PAGE_SIZE };
    if (startCursor) body['start_cursor'] = startCursor;

    const pageResp = await nango.post<NotionQueryResponse>({
      ...proxyConfig,
      data: body,
      retries: 3,
    });

    const { results, has_more, next_cursor } = pageResp.data ?? {
      results: [],
      has_more: false,
      next_cursor: null,
    };

    for (const page of results) {
      const id = page.id;
      const row = page.properties ?? {};
      entries.push({ id, row });
    }

    startCursor = has_more && next_cursor ? next_cursor : undefined;
  } while (startCursor);

  const databaseResponse = await nango.get<NotionDatabase>({
      // https://developers.notion.com/reference/retrieve-a-database
    endpoint: `/v1/databases/${input.databaseId}`,
    retries: 3,
    // connectionId: 'your-notion-connection-id'
    // providerConfigKey: 'notion'
  });

  const data = databaseResponse.data;

  return {
    id: input.databaseId,
    title: (data.title && data.title[0]?.plain_text) || '',
    path: data.url,
    last_modified: data.last_edited_time,
    meta: {
      created_time: data.created_time,
      last_edited_time: data.last_edited_time,
    },
    entries,
  };
}

const databaseInput = { databaseId: 'your-database-id' };
await run(databaseInput);
