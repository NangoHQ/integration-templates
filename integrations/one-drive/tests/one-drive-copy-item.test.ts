import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/copy-item.js';

describe('one-drive copy-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'copy-item',
        Model: 'ActionOutput_one_drive_copyitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
