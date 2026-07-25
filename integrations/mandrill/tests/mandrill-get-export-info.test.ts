import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-export-info.js';

describe('mandrill get-export-info tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-export-info',
        Model: 'ActionOutput_mandrill_getexportinfo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
