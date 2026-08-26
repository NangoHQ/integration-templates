import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-card-table-step.js';

describe('basecamp update-card-table-step tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-card-table-step',
        Model: 'ActionOutput_basecamp_updatecardtablestep'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
