import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-personal-access-token.js';

describe('datadog create-personal-access-token tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-personal-access-token',
        Model: 'ActionOutput_datadog_createpersonalaccesstoken'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
