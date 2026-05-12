import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-item.js';

describe('one-drive update-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-item',
        Model: 'ActionOutput_one_drive_updateitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
