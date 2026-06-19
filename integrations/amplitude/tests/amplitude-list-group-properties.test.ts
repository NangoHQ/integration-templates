import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-group-properties.js';

describe('amplitude list-group-properties tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-group-properties',
        Model: 'ActionOutput_amplitude_listgroupproperties'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
