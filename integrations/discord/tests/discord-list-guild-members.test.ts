import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-guild-members.js';

describe('discord list-guild-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-guild-members',
        Model: 'ActionOutput_discord_listguildmembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
