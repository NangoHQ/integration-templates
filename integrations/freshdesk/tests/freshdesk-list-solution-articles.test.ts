import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-solution-articles.js';

describe('freshdesk list-solution-articles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-solution-articles',
        Model: 'ActionOutput_freshdesk_listsolutionarticles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
