import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-timelog.js';

describe('wrike delete-timelog tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-timelog',
        Model: 'ActionOutput_wrike_deletetimelog'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
