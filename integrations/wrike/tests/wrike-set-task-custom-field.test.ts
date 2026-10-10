import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-task-custom-field.js';

describe('wrike set-task-custom-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-task-custom-field',
        Model: 'ActionOutput_wrike_settaskcustomfield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
