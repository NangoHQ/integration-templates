import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-solution-article.js';

describe('freshdesk delete-solution-article tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-solution-article',
        Model: 'ActionOutput_freshdesk_deletesolutionarticle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
