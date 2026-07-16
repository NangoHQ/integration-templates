import { expect, it, describe } from 'vitest';

import createAction from '../actions/search-team-members.js';

describe('squareup-sandbox search-team-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-team-members',
        Model: 'ActionOutput_squareup_sandbox_searchteammembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
