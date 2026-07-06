import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-connections.js';

describe('make list-connections tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-connections',
        Model: 'ActionOutput_make_listconnections'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
