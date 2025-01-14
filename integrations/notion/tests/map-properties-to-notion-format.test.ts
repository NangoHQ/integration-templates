// mapPropertiesToNotionFormat.test.ts
import { describe, it, expect } from 'vitest';
import { mapPropertiesToNotionFormat } from '../helpers/map-properties';

describe('mapPropertiesToNotionFormat', () => {
    it('handles title, select, and relation', () => {
        const schema = {
            Name: { type: 'title' },
            Priority: { type: 'select' },
            'Parent Goal': { type: 'relation' }
        };

        const userInput = {
            Name: 'Increase website visits by 10%',
            Priority: 'P1',
            'Parent Goal': ['another-page-id']
        };

        const result = mapPropertiesToNotionFormat(schema, userInput);

        expect(result).toEqual({
            Name: {
                title: [{ text: { content: 'Increase website visits by 10%' } }]
            },
            Priority: { select: { name: 'P1' } },
            'Parent Goal': { relation: [{ id: 'another-page-id' }] }
        });
    });

    it('handles multi_select, date, checkbox, number', () => {
        const schema = {
            Labels: { type: 'multi_select' },
            'Due Date': { type: 'date' },
            'Done?': { type: 'checkbox' },
            Count: { type: 'number' }
        };

        const userInput = {
            Labels: ['Bug', 'UI/UX'],
            'Due Date': '2024-01-31',
            'Done?': true,
            Count: 42
        };

        const result = mapPropertiesToNotionFormat(schema, userInput);

        expect(result).toEqual({
            Labels: { multi_select: [{ name: 'Bug' }, { name: 'UI/UX' }] },
            'Due Date': { date: { start: '2024-01-31' } },
            'Done?': { checkbox: true },
            Count: { number: 42 }
        });
    });

    it('handles status, email, phone, rich_text', () => {
        const schema = {
            Status: { type: 'status' },
            Contact: { type: 'email' },
            Phone: { type: 'phone_number' },
            Description: { type: 'rich_text' }
        };

        const userInput = {
            Status: 'In progress',
            Contact: 'person@example.com',
            Phone: '+1 555-1234',
            Description: 'Some text content...'
        };

        const result = mapPropertiesToNotionFormat(schema, userInput);

        expect(result).toEqual({
            Status: { status: { name: 'In progress' } },
            Contact: { email: 'person@example.com' },
            Phone: { phone_number: '+254712345678' },
            Description: {
                rich_text: [{ text: { content: 'Some text content...' } }]
            }
        });
    });

    it('skips unmapped properties or invalid types', () => {
        const schema = {
            Name: { type: 'title' },
            Priority: { type: 'select' }
        };

        const userInput = {
            Name: 123,
            Priority: 'High',
            Extra: '???'
        };

        const result = mapPropertiesToNotionFormat(schema, userInput);

        expect(result).toEqual({
            Priority: { select: { name: 'High' } }
        });
    });
});
