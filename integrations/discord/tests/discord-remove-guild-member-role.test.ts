import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-guild-member-role.js';

describe('discord remove-guild-member-role tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-guild-member-role',
        Model: 'ActionOutput_discord_removeguildmemberrole'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
