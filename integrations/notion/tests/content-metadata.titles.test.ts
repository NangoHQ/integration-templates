import { describe, expect, test, vi } from 'vitest';
import sync from '../syncs/content-metadata.js';
import page from './fixtures/content-metadata-page.json';

const titleProperty = page.properties.Name;
const titleParts = titleProperty.title;
const standalonePageWithTitle = (parts = titleParts) => ({
    ...page,
    parent: { type: 'page_id', page_id: '00000000-0000-4000-8000-000000000005' },
    properties: { title: { ...titleProperty, title: parts } }
});
const dataSourcePageWithTitle = (name: string, parts = titleParts) => ({
    ...page,
    properties: {
        Status: page.properties.Status,
        [name]: { ...titleProperty, title: parts }
    }
});
const firstTitlePart = titleParts[0]!;
const splitTitleParts = [
    { ...firstTitlePart, text: { ...firstTitlePart.text, content: 'Launch ' }, plain_text: 'Launch ' },
    { ...firstTitlePart, text: { ...firstTitlePart.text, content: 'checklist' }, plain_text: 'checklist' }
];

async function expectSyncedTitle(item: unknown, expected: string | undefined) {
    const nango = new global.vitest.NangoSyncMock({ dirname: __dirname, name: 'content-metadata', Model: 'ContentMetadata' });
    vi.spyOn(nango, 'post').mockResolvedValue({
        data: { object: 'list', results: [item], next_cursor: null, has_more: false }
    });
    const batchSave = vi.spyOn(nango, 'batchSave').mockResolvedValue();

    await sync.exec(nango);

    expect(batchSave).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ title: expected })]), 'ContentMetadata');
}

describe('Notion content-metadata titles', () => {
    describe('standalone pages', () => {
        test('reads the title from properties.title', async () => {
            await expectSyncedTitle(standalonePageWithTitle(), 'Launch checklist');
        });

        test('concatenates title fragments', async () => {
            await expectSyncedTitle(standalonePageWithTitle(splitTitleParts), 'Launch checklist');
        });

        test('leaves an empty title undefined', async () => {
            await expectSyncedTitle(standalonePageWithTitle([]), undefined);
        });
    });

    describe('data source pages', () => {
        test.each(['Name', 'Nombre'])('reads the title from properties.%s', async (name) => {
            await expectSyncedTitle(dataSourcePageWithTitle(name), 'Launch checklist');
        });

        test.each(['Name', 'Nombre'])('concatenates title fragments from properties.%s', async (name) => {
            await expectSyncedTitle(dataSourcePageWithTitle(name, splitTitleParts), 'Launch checklist');
        });

        test.each(['Name', 'Nombre'])('leaves an empty properties.%s title undefined', async (name) => {
            await expectSyncedTitle(dataSourcePageWithTitle(name, []), undefined);
        });
    });

    test('handles a missing title property defensively', async () => {
        await expectSyncedTitle({ ...page, properties: { Status: page.properties.Status } }, undefined);
    });

    test('finds the title by type when another property is named title', async () => {
        await expectSyncedTitle({ ...page, properties: { title: page.properties.Status, Name: titleProperty } }, 'Launch checklist');
    });

    test.each([
        { label: 'single fragment', parts: titleParts, expected: 'Launch checklist' },
        { label: 'multiple fragments', parts: [...titleParts, ...titleParts], expected: 'Launch checklistLaunch checklist' },
        { label: 'empty', parts: [], expected: undefined }
    ])('preserves data source titles: $label', async ({ parts, expected }) => {
        await expectSyncedTitle(
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
