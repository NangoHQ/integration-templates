import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-synthetic-api-test.js';

describe('datadog update-synthetic-api-test tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-synthetic-api-test',
        Model: 'ActionOutput_datadog_updatesyntheticapitest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
