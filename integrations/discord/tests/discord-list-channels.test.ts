import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-channels.js';

describe('discord list-channels tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-channels',
        Model: 'ActionOutput_discord_listchannels'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
