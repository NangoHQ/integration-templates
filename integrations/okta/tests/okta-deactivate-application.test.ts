import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/deactivate-application.js';

describe('okta deactivate-application tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'deactivate-application',
        Model: 'ActionOutput_okta_cc_deactivateapplication'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
