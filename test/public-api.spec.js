import createVersidag from '../src';
import resolveVersions from '../src/resolve-versions';
import resolveHeads from '../src/resolve-heads';

jest.mock('../src/resolve-heads', () => jest.fn(() => ({
    ancestorCid: 'ancestor',
    headCids: ['bar', 'foo'],
    versionsCount: 1,
})));
jest.mock('../src/resolve-versions', () => jest.fn(() => ({
    nextCids: [],
    versions: ['foo'],
})));

afterEach(() => {
    resolveVersions.mockClear();
    resolveHeads.mockClear();
});

describe('factory', () => {
    it('should return a versidag instance, with the correct heads', () => {
        const config = {
            readNode: () => 'read',
            writeNode: () => 'write',
            tieBreaker: () => 'tie-breaker',
        };

        const versidag = createVersidag(['foo'], config);

        expect(versidag.headCids).toEqual(['foo']);
        expect(typeof versidag.config).toBe('object');
        expect(typeof versidag.add).toBe('function');
        expect(typeof versidag.union).toBe('function');
        expect(typeof versidag.merge).toBe('function');
    });

    it('should return a versidag instance, with the no heads', () => {
        const config = {
            readNode: () => 'read',
            writeNode: () => 'write',
            tieBreaker: () => 'tie-breaker',
        };

        const versidag = createVersidag(config);

        expect(versidag.headCids).toEqual([]);
        expect(typeof versidag.config).toBe('object');
        expect(typeof versidag.add).toBe('function');
        expect(typeof versidag.union).toBe('function');
        expect(typeof versidag.merge).toBe('function');
    });

    it('should remove duplicates and sort the heads so that they are deterministic', () => {
        const versidag = createVersidag(['B', 'A', 'C', 'B'], {});

        expect(versidag.headCids).toEqual(['A', 'B', 'C']);
    });

    it('should call getConfig', () => {
        const config = {
            readNode: () => 'read',
            writeNode: () => 'write',
            tieBreaker: () => 'tie-breaker',
        };

        const versidag = createVersidag(config);

        expect(versidag.config.readTimeout).toBe(null);
        expect(versidag.config.readConcurrency).toBe(Infinity);
        expect(versidag.config.writeTimeout).toBe(null);
        expect(versidag.config.writeConcurrency).toBe(Infinity);
        expect(typeof versidag.readNode).not.toBe(config.readNode);
        expect(typeof versidag.writeNode).not.toBe(config.writeNode);
        expect(typeof versidag.tieBreaker).not.toBe(config.tieBreaker);
    });
});

describe('add', () => {
    it('should return a new versidag instance', async () => {
        const config = {
            writeNode: () => {},
        };

        const versidag = createVersidag(config);
        const newVersidag = await versidag.add('foo', 1);

        expect(versidag).not.toBe(newVersidag);
    });

    it('should add a new dag node', async () => {
        const config = {
            writeNode: jest.fn(() => 'abc'),
        };

        const versidag = createVersidag(config);

        await versidag.add('foo', 1);

        expect(config.writeNode).toHaveBeenCalledTimes(1);
        expect(config.writeNode).toHaveBeenCalledWith({
            parents: [],
            version: 'foo',
            meta: 1,
        }, versidag.config);
    });

    it('should add a new version with the right parents', async () => {
        const config = {
            writeNode: jest.fn(() => 'abc'),
        };

        const versidagA = await createVersidag(config).add('foo', 1);

        await versidagA.add('bar', 2);

        expect(config.writeNode).toHaveBeenCalledTimes(2);
        expect(config.writeNode).toHaveBeenNthCalledWith(1, {
            parents: [],
            version: 'foo',
            meta: 1,
        }, versidagA.config);
        expect(config.writeNode).toHaveBeenNthCalledWith(2, {
            parents: ['abc'],
            version: 'bar',
            meta: 2,
        }, versidagA.config);
    });
});

describe('union', () => {
    it('should return a new versidag instance', () => {
        const versidag1 = createVersidag(['B', 'A'], {});
        const versidag2 = createVersidag(['D', 'C'], {});

        const finalVersidag = versidag1.union(versidag2.headCids);

        expect(finalVersidag).not.toBe(versidag1);
        expect(finalVersidag).not.toBe(versidag2);
    });

    it('should concatenate, order and sort the heads so that they are deterministic', () => {
        const versidag1 = createVersidag(['B', 'A'], {});
        const versidag2 = createVersidag(['D', 'C'], {});

        const finalVersidag = versidag1.union(versidag2.headCids);

        expect(finalVersidag.headCids).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should not do any I/O', () => {
        const config = {
            readNode: jest.fn(() => {}),
            writeNode: jest.fn(() => {}),
        };

        const versidag1 = createVersidag(['B', 'A'], config);
        const versidag2 = createVersidag(['D', 'C'], config);

        versidag1.union(versidag2.headCids);

        expect(config.readNode).toHaveBeenCalledTimes(0);
        expect(config.writeNode).toHaveBeenCalledTimes(0);
    });
});

describe('merge', () => {
    it('should return a new versidag instance', async () => {
        const config = {
            writeNode: () => {},
        };

        const versidag1 = createVersidag(['B', 'A'], config);
        const versidag2 = createVersidag(['D', 'C'], config);

        const finalVersidag = await versidag1.merge(versidag2.headCids);

        expect(finalVersidag).not.toBe(versidag1);
        expect(finalVersidag).not.toBe(versidag2);
    });

    it('should call resolveHeads so that non-concurrent heads are removed', async () => {
        const config = {
            writeNode: () => {},
        };

        const versidag1 = createVersidag(['B', 'A'], config);
        const versidag2 = createVersidag(['D', 'C'], config);

        await versidag1.merge(versidag2.headCids);

        expect(resolveHeads).toHaveBeenCalledTimes(1);
        expect(resolveHeads).toHaveBeenCalledWith(['A', 'B', 'C', 'D'], versidag1.config, 1);
    });

    it('should concatenate, remove duplicates and sort the heads so that they are deterministic', async () => {
        const config = {
            writeNode: () => {},
        };

        const versidag1 = createVersidag(['B', 'A', 'B'], config);
        const versidag2 = createVersidag(['D', 'C', 'A'], config);

        await versidag1.merge(versidag2.headCids);

        expect(resolveHeads).toHaveBeenCalledTimes(1);
        expect(resolveHeads).toHaveBeenCalledWith(['A', 'B', 'C', 'D'], versidag1.config, 1);
    });

    it('should be a no-op if all heads returned from resolveHeads are the same', async () => {
        const config = {
            writeNode: () => {},
        };

        const versidag1 = createVersidag(['foo', 'bar'], config);
        const versidag2 = createVersidag(['bar'], config);

        const finalVersidag = await versidag1.merge(versidag2.headCids);

        expect(finalVersidag).toBe(versidag1);
    });

    it('should create a merge node', async () => {
        const config = {
            writeNode: jest.fn(() => {}),
        };

        const versidag1 = createVersidag(['B', 'A', 'D'], config);
        const versidag2 = createVersidag(['D', 'C', 'B'], config);

        await versidag1.merge(versidag2.headCids);

        expect(config.writeNode).toHaveBeenCalledTimes(1);
        expect(config.writeNode).toHaveBeenCalledWith({
            parents: ['bar', 'foo'],
        }, versidag1.config);
    });

    it('should create a merge node with a version', async () => {
        const config = {
            writeNode: jest.fn(() => {}),
        };

        const versidag1 = createVersidag(['B', 'A', 'D'], config);
        const versidag2 = createVersidag(['D', 'C', 'B'], config);

        await versidag1.merge(versidag2.headCids, 'baz');

        expect(config.writeNode).toHaveBeenCalledTimes(1);
        expect(config.writeNode).toHaveBeenCalledWith({
            parents: ['bar', 'foo'],
            version: 'baz',
        }, versidag1.config);
    });
});

describe('resolve', () => {
    it('should call resolveVersions with the right arguments', async () => {
        const versidag = createVersidag(['A', 'B'], {});

        await versidag.resolve();
        await versidag.resolve({
            fromCids: ['A'],
            limit: 2,
        });

        expect(resolveVersions).toHaveBeenCalledTimes(2);
        expect(resolveVersions).toHaveBeenNthCalledWith(1, ['A', 'B'], versidag.config, Infinity);
        expect(resolveVersions).toHaveBeenNthCalledWith(2, ['A'], versidag.config, 2);
    });

    it('should return the resolveVersions result', async () => {
        const versidag = createVersidag(['A', 'B'], {});
        const result = await versidag.resolve();

        expect(result).toEqual({
            nextCids: [],
            versions: ['foo'],
        });
    });
});
