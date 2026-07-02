import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-panel.js';

describe('lever-basic create-panel tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-panel',
        Model: 'ActionOutput_lever_basic_createpanel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
