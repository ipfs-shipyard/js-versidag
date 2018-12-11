import getConfig from '../src/config';

it('should set defaults', () => {
    const config = getConfig({});

    expect(config).toMatchObject({
        readConcurrency: Infinity,
        readTimeout: null,
        writeConcurrency: Infinity,
        writeTimeout: null,
    });
});

it('should not do anything if already enhanced', () => {
    const config = getConfig({});
    const config2 = getConfig(config);

    expect(config).toBe(config2);
});

describe('readNode', () => {
    it('should enhance readNode so that it is called with the config', async () => {
        const readNode = jest.fn(() => {});
        const config = getConfig({
            readNode,
            readTimeout: 100,
        });

        await config.readNode('foo');

        expect(readNode).toHaveBeenCalledWith('foo', config);
    });

    it('should respect the readConcurrency', () => {
        const readNode = jest.fn(() => new Promise(() => {}));
        const config = getConfig({
            readNode,
            readConcurrency: 2,
        });

        config.readNode();
        config.readNode();
        config.readNode();

        expect(readNode).toHaveBeenCalledTimes(2);
    });
});

describe('writeNode', () => {
    it('should enhance writeNode so that it is called with the config', async () => {
        const writeNode = jest.fn(() => {});
        const config = getConfig({
            writeNode,
            writeTimeout: 100,
        });

        await config.writeNode('foo');

        expect(writeNode).toHaveBeenCalledWith('foo', config);
    });

    it('should respect the writeConcurrency', () => {
        const writeNode = jest.fn(() => new Promise(() => {}));
        const config = getConfig({
            writeNode,
            writeConcurrency: 2,
        });

        config.writeNode();
        config.writeNode();
        config.writeNode();

        expect(writeNode).toHaveBeenCalledTimes(2);
    });
});

describe('tieBreaker', () => {
    const config = getConfig({
        tieBreaker: (node1, node2) => node1.meta - node2.meta,
    });

    it('should return 0 if cids are the same', () => {
        expect(config.tieBreaker({ cid: 1 }, { cid: 1 })).toBe(0);
    });

    it('should respect tie-breaker result', () => {
        expect(config.tieBreaker({ cid: 1, node: { meta: 1 } }, { cid: 2, node: { meta: 2 } })).toBe(1);
        expect(config.tieBreaker({ cid: 1, node: { meta: 2 } }, { cid: 2, node: { meta: 1 } })).toBe(-1);
    });

    it('should fallback to comparing cids when tie-breaker returns 0', () => {
        expect(config.tieBreaker({ cid: 1, node: { meta: 1 } }, { cid: 2, node: { meta: 1 } })).toBe(1);
        expect(config.tieBreaker({ cid: 2, node: { meta: 1 } }, { cid: 1, node: { meta: 1 } })).toBe(-1);
        expect(config.tieBreaker({ cid: 1, node: { meta: 1 } }, { cid: 1, node: { meta: 1 } })).toBe(0);
    });

    it('should give priority to nodes without meta', () => {
        expect(config.tieBreaker({ cid: 1, node: { meta: 1 } }, { cid: 2, node: {} })).toBe(-1);
        expect(config.tieBreaker({ cid: 1, node: {} }, { cid: 2, node: { meta: 1 } })).toBe(1);
    });

    it('should fallback to comparing cids if both nodes have not meta', () => {
        expect(config.tieBreaker({ cid: 1, node: {} }, { cid: 2, node: {} })).toBe(1);
        expect(config.tieBreaker({ cid: 2, node: {} }, { cid: 1, node: {} })).toBe(-1);
    });
});
