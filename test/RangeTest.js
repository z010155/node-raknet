const assert = require('assert');
const {Range} = require('../Structures/RangeList');

describe('Range', () => {
    describe('constructor', () => {
        it('should set the internal variables correctly', () => {
            let range = new Range(1,10);
            assert.equal(range.min, 1);
            assert.equal(range.max, 10);
        });
    });
    describe('toArray', () => {
        it('should return an array between min and max', () => {
            let range = new Range(1, 2);
            assert.deepEqual(range.toArray(), [1,2]);
        });
    });
    describe('isInRange', () => {
        it('should return true if the given number is within the min and max', () => {
            let range = new Range(1, 100);
            assert.equal(range.isInRange(10), true);
            assert.equal(range.isInRange(100), true);
            assert.equal(range.isInRange(0), false);
            assert.equal(range.isInRange(101), false);
        });
    });
    describe('canExtendMax', () => {
        it('returns true if the number given is one above max', () => {
            let range = new Range(1, 100);
            assert.equal(range.canExtendMax(101), true);
            assert.equal(range.canExtendMax(100), false);
        });
    });
    describe('canExtendMin', () => {
        it('returns true if the number given is one below the min', () => {
            let range = new Range(1, 100);
            assert.equal(range.canExtendMin(0), true);
            assert.equal(range.canExtendMin(-1), false);
        });
    });
});
