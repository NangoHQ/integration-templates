import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-application-keys.js';

describe('datadog list-application-keys tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-application-keys',
        Model: 'ActionOutput_datadog_listapplicationkeys'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
