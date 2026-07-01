import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-email.js';

describe('instantly get-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-email',
        Model: 'ActionOutput_instantly_getemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
