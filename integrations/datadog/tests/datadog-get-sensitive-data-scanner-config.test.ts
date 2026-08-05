import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-sensitive-data-scanner-config.js';

describe('datadog get-sensitive-data-scanner-config tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-sensitive-data-scanner-config',
        Model: 'ActionOutput_datadog_getsensitivedatascannerconfig'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
