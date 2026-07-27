import { vi, expect, it, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import createAction from '../actions/download-bulk-file-report.js';

describe('millionverifier download-bulk-file-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'download-bulk-file-report',
        Model: 'ActionOutput_millionverifier_downloadbulkfilereport'
    });

    const mockPath = resolve(__dirname, './download-bulk-file-report.test.json');
    const mockData = JSON.parse(readFileSync(mockPath, 'utf-8'));
    const apiKey = mockData.api?.get?.['/bulkapi/v2/download']?.request?.params?.key;

    nangoMock.getConnection.mockResolvedValue({
        credentials: {
            type: 'API_KEY',
            apiKey: apiKey || 'test-api-key'
        }
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
