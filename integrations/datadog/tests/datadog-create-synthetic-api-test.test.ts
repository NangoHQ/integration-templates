import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-synthetic-api-test.js';

describe('datadog create-synthetic-api-test tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-synthetic-api-test',
        Model: 'ActionOutput_datadog_createsyntheticapitest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
