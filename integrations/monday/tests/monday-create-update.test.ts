import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-update.js';

describe('monday create-update tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-update',
        Model: 'ActionOutput_monday_createupdate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
