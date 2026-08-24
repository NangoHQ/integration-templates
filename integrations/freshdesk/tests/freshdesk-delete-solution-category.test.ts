import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-solution-category.js';

describe('freshdesk delete-solution-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-solution-category',
        Model: 'ActionOutput_freshdesk_deletesolutioncategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
