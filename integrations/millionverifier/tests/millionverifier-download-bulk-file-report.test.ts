import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/download-bulk-file-report.js';

describe('millionverifier download-bulk-file-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'download-bulk-file-report',
        Model: 'ActionOutput_millionverifier_downloadbulkfilereport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
