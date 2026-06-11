import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-agents.js';

describe('zoho-desk list-agents tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-agents',
        Model: 'ActionOutput_zoho_desk_listagents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
