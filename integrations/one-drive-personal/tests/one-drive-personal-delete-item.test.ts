import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-item.js';

describe('one-drive-personal delete-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-item',
        Model: 'ActionOutput_one_drive_personal_deleteitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
