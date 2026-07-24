import { vi, expect, it, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import createAction from '../actions/delete-bulk-file.js';

describe('millionverifier delete-bulk-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-bulk-file',
        Model: 'ActionOutput_millionverifier_deletebulkfile'
    });

    it('should output the action output that is expected', async () => {
        const mockPath = resolve(__dirname, './delete-bulk-file.test.json');
        const mockData = JSON.parse(readFileSync(mockPath, 'utf-8'));
        const apiKey = mockData.api?.get?.['/bulkapi/v2/delete']?.request?.params?.key;

        nangoMock.getConnection.mockResolvedValue({
            credentials: {
                type: 'API_KEY',
                apiKey: apiKey || 'test-api-key'
            }
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
