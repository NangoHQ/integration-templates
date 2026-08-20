import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-solution-article.js';

describe('freshdesk update-solution-article tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-solution-article',
        Model: 'ActionOutput_freshdesk_updatesolutionarticle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
