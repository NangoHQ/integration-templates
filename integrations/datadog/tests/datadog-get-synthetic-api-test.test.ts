import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-synthetic-api-test.js';

describe('datadog get-synthetic-api-test tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-synthetic-api-test',
        Model: 'ActionOutput_datadog_getsyntheticapitest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
