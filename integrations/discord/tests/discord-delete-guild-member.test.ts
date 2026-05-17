import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-guild-member.js';

describe('discord delete-guild-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-guild-member',
        Model: 'ActionOutput_discord_deleteguildmember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
