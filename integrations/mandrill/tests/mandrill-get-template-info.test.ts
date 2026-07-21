import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-template-info.js';

describe('mandrill get-template-info tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-template-info',
        Model: 'ActionOutput_mandrill_gettemplateinfo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
