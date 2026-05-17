import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-team-member.js';

describe('microsoft-teams add-team-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-team-member',
        Model: 'ActionOutput_microsoft_teams_addteammember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
