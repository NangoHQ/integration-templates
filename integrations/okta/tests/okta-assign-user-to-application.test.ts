import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/assign-user-to-application.js';

describe('okta assign-user-to-application tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'assign-user-to-application',
        Model: 'ActionOutput_okta_cc_assignusertoapplication'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
