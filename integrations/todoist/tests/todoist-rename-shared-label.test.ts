import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/rename-shared-label.js';

describe('todoist rename-shared-label tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'rename-shared-label',
        Model: 'ActionOutput_todoist_renamesharedlabel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
