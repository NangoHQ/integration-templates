import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/activate-application.js';

describe('okta activate-application tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'activate-application',
        Model: 'ActionOutput_okta_cc_activateapplication'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
