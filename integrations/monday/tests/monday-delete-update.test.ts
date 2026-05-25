import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-update.js';

describe('monday delete-update tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-update',
        Model: 'ActionOutput_monday_deleteupdate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
