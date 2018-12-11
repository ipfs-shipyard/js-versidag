import { memoize } from 'lodash';
import binsert from 'binsert';
import resolveHeads from './resolve-heads';
import createTraverser from './traverse';

const resolveSequence = async (resolvedHeads, config) => {
    const { headCids, ancestorCid } = resolvedHeads;
    const { tieBreaker } = config;
    const traverse = createTraverser(config);

    const sequence = [];
    const sequenceMap = new Map();

    const addToSequence = (entry) => {
        // If the entry is already in the sequence, remove it first!
        if (sequenceMap.has(entry.cid)) {
            const index = sequence.findIndex(({ cid }) => cid === entry.cid);

            sequence.splice(index, 1);
        } else {
            sequenceMap.set(entry.cid, true);
        }

        sequence.push(entry);
    };

    await traverse(
        headCids,
        // Iterator
        (entry) => {
            if (entry.node.version != null) {
                addToSequence(entry);
            }
        },
        // Add to stack
        (stack, entry) => {
            // Do not add ancestor parents
            if (ancestorCid && entry.childCid === ancestorCid) {
                return;
            }

            // Short-circuit if there's no way to order the entry
            // It would have been added to the beggining of the stack but it's faster to just call `.unshift`
            if (entry.node.meta == null) {
                stack.unshift(entry);
            // Insert the entry into the correct place in the stack
            // A binary insert is used because the stack is already ordered
            } else {
                binsert({
                    compare: (entry1, entry2) => tieBreaker(entry1, entry2),
                    get: (index) => stack[index],
                    insert: (index, value) => { stack.splice(index, 0, value); },
                    length: stack.length,
                    value: entry,
                });
            }
        },
    );

    return sequence;
};

const buildResult = (resolvedSequence, config, limit) => {
    const versions = resolvedSequence
    .slice(0, limit)
    .map(({ node }) => {
        const entry = { version: node.version };

        if (node.meta != null) {
            entry.meta = node.meta;
        }

        return entry;
    });

    const nextCids = resolvedSequence
    .slice(limit)
    .map(({ cid }) => cid);

    return {
        versions,
        nextCids,
    };
};

const resolveVersions = async (headCids, config, limit = Infinity) => {
    // Memoize readNode so that lookups to the same cid are only made once
    config = {
        ...config,
        readNode: memoize(config.readNode),
    };

    const resolvedHeads = await resolveHeads(headCids, config, limit);
    const resolvedSequence = await resolveSequence(resolvedHeads, config);

    return buildResult(resolvedSequence, config, limit);
};

export default resolveVersions;
