import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-sensitive-data-scanner-group.js';

describe('datadog create-sensitive-data-scanner-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-sensitive-data-scanner-group',
        Model: 'ActionOutput_datadog_createsensitivedatascannergroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
