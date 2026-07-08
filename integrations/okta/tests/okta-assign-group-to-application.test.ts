import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/assign-group-to-application.js';

describe('okta assign-group-to-application tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'assign-group-to-application',
        Model: 'ActionOutput_okta_cc_assigngrouptoapplication'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
