import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-solution-category.js';

describe('freshdesk update-solution-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-solution-category',
        Model: 'ActionOutput_freshdesk_updatesolutioncategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
