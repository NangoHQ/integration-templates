import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-articles.js';

describe('zoho-desk list-articles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-articles',
        Model: 'ActionOutput_zoho_desk_listarticles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
