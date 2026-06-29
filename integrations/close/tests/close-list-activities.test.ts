import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-activities.js';

describe('close list-activities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-activities',
        Model: 'ActionOutput_close_listactivities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
