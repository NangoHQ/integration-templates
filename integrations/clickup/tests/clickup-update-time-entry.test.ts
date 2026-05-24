import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-time-entry.js';

describe('clickup update-time-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-time-entry',
        Model: 'ActionOutput_clickup_updatetimeentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
