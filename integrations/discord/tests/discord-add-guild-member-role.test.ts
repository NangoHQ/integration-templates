import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-guild-member-role.js';

describe('discord add-guild-member-role tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-guild-member-role',
        Model: 'ActionOutput_discord_addguildmemberrole'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
