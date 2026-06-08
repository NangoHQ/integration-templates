import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-databases.js';

describe('snowflake-jwt list-databases tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-databases',
        Model: 'ActionOutput_snowflake_jwt_listdatabases'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
