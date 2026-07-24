import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-shared-label.js';

describe('todoist remove-shared-label tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-shared-label',
        Model: 'ActionOutput_todoist_removesharedlabel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
