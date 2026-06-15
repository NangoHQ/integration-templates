import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-checklist-item.js';

describe('trello add-checklist-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-checklist-item',
        Model: 'ActionOutput_trello_addchecklistitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
