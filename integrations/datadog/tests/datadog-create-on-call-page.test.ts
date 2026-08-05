import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-on-call-page.js';

describe('datadog create-on-call-page tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-on-call-page',
        Model: 'ActionOutput_datadog_createoncallpage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
