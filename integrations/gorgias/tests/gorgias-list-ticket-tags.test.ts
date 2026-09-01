import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ticket-tags.js';

describe('gorgias list-ticket-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ticket-tags',
        Model: 'ActionOutput_gorgias_listtickettags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
