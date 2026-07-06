import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-alias.js';

describe('mixpanel create-alias tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-alias',
        Model: 'ActionOutput_mixpanel_createalias'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
