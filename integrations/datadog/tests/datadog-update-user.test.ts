import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-user.js';

describe('datadog update-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-user',
        Model: 'ActionOutput_datadog_updateuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
