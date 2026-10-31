// Chalane ke liye: npm test   (Node 18+, koi extra package nahi)
const test = require('node:test');
const assert = require('node:assert');
const LinkedList = require('../structures/LinkedList');

const build = ids => LinkedList.fromArray(ids.map(id => ({ id, name: id })));
const ids = l => l.toArray().map(x => x.id);

test('insertAtHead / insertAtTail', () => {
  const l = new LinkedList();
  l.insertAtTail({ id: 'b' }); l.insertAtHead({ id: 'a' }); l.insertAtTail({ id: 'c' });
  assert.deepStrictEqual(ids(l), ['a', 'b', 'c']);
  assert.strictEqual(l.size, 3);
  assert.strictEqual(l.tail.data.id, 'c');
});

test('findById and update', () => {
  const l = build(['a', 'b', 'c']);
  assert.strictEqual(l.findById('b').id, 'b');
  assert.strictEqual(l.findById('zzz'), null);
  l.updateById('b', { name: 'Brufen' });
  assert.strictEqual(l.findById('b').name, 'Brufen');
  assert.strictEqual(l.updateById('zzz', {}), null);
});

test('delete head, middle, tail', () => {
  const l = build(['a', 'b', 'c', 'd']);
  assert.ok(l.deleteById('a'));  assert.deepStrictEqual(ids(l), ['b', 'c', 'd']);
  assert.ok(l.deleteById('c'));  assert.deepStrictEqual(ids(l), ['b', 'd']);
  assert.ok(l.deleteById('d'));  assert.strictEqual(l.tail.data.id, 'b');
  assert.ok(l.deleteById('b'));  assert.strictEqual(l.head, null); assert.strictEqual(l.tail, null);
  assert.strictEqual(l.size, 0);
});

test('delete / find on empty list does not crash', () => {
  const l = new LinkedList();
  assert.strictEqual(l.deleteById('x'), false);
  assert.strictEqual(l.findById('x'), null);
  assert.deepStrictEqual(l.toArray(), []);
});

test('tail stays correct after insert following delete', () => {
  const l = build(['a', 'b']);
  l.deleteById('b'); l.insertAtTail({ id: 'z' });
  assert.deepStrictEqual(ids(l), ['a', 'z']);
});

test('reverse', () => {
  const l = build(['a', 'b', 'c']);
  l.reverse();
  assert.deepStrictEqual(ids(l), ['c', 'b', 'a']);
  assert.strictEqual(l.tail.data.id, 'a');
});

test('merge sort (asc/desc) and tail fix', () => {
  const l = LinkedList.fromArray([5, 3, 9, 1, 7].map(n => ({ id: String(n), n })));
  l.sortBy((a, b) => a.n - b.n);
  assert.deepStrictEqual(l.toArray().map(x => x.n), [1, 3, 5, 7, 9]);
  assert.strictEqual(l.tail.data.n, 9);
  l.sortBy((a, b) => b.n - a.n);
  assert.deepStrictEqual(l.toArray().map(x => x.n), [9, 7, 5, 3, 1]);
});
