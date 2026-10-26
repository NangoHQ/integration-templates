import { describe, expect, test, vi } from 'vitest';
import sync from '../syncs/content-metadata.js';
import page from './fixtures/content-metadata-page.json';

const titleProperty = page.properties.Name;
const titleParts = titleProperty.title;
const pageWithTitle = (name: string, parts = titleParts) => ({
    ...page,
    ...(name === 'title' && { parent: { type: 'page_id', page_id: '00000000-0000-4000-8000-000000000005' } }),
    properties: {
        ...(name !== 'title' && { Status: page.properties.Status }),
        [name]: { ...titleProperty, title: parts }
    }
});

async function expectTitle(item: unknown, expected: string | undefined) {
    const nango = new global.vitest.NangoSyncMock({ dirname: __dirname, name: 'content-metadata', Model: 'ContentMetadata' });
    vi.spyOn(nango, 'post').mockResolvedValue({
        data: { object: 'list', results: [item], next_cursor: null, has_more: false }
    });
    const batchSave = vi.spyOn(nango, 'batchSave').mockResolvedValue();

    await sync.exec(nango);

    expect(batchSave).toHaveBeenCalledOnce();
    expect(batchSave).toHaveBeenCalledWith([expect.objectContaining({ title: expected })], 'ContentMetadata');
}

describe('Notion content-metadata titles', () => {
    test.each(['title', 'Name', 'Nombre'])('reads a page title from properties.%s', async (name) => {
        await expectTitle(pageWithTitle(name), 'Launch checklist');
    });

    test.each(['title', 'Name', 'Nombre'])('concatenates title fragments from properties.%s', async (name) => {
        const first = titleParts[0]!;
        await expectTitle(
            pageWithTitle(name, [
                { ...first, text: { ...first.text, content: 'Launch ' }, plain_text: 'Launch ' },
                { ...first, text: { ...first.text, content: 'checklist' }, plain_text: 'checklist' }
            ]),
            'Launch checklist'
        );
    });

    test.each(['title', 'Name', 'Nombre'])('leaves an empty properties.%s title undefined', async (name) => {
        await expectTitle(pageWithTitle(name, []), undefined);
    });

    test('handles a missing title property defensively', async () => {
        await expectTitle({ ...page, properties: { Status: page.properties.Status } }, undefined);
    });

    test('finds the title by type when another property is named title', async () => {
        await expectTitle({ ...page, properties: { title: page.properties.Status, Name: titleProperty } }, 'Launch checklist');
    });

    test.each([
        { label: 'single fragment', parts: titleParts, expected: 'Launch checklist' },
        { label: 'multiple fragments', parts: [...titleParts, ...titleParts], expected: 'Launch checklistLaunch checklist' },
        { label: 'empty', parts: [], expected: undefined }
    ])('preserves data source titles: $label', async ({ parts, expected }) => {
        await expectTitle(
            {
                object: 'data_source',
                id: '00000000-0000-4000-8000-000000000003',
                created_time: page.created_time,
                last_edited_time: page.last_edited_time,
                title: parts,
                parent: { type: 'database_id', database_id: '00000000-0000-4000-8000-000000000004' }
            },
            expected
        );
    });
});
