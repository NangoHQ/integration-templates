import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-column.js';

describe('monday update-column tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-column',
        Model: 'ActionOutput_monday_updatecolumn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
