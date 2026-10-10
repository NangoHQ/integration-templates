import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-timelog.js';

describe('wrike create-timelog tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-timelog',
        Model: 'ActionOutput_wrike_createtimelog'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
