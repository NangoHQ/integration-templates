import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-folder-item.js';

describe('canva move-folder-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'move-folder-item',
        Model: 'ActionOutput_canva_movefolderitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
