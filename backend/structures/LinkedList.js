const Node = require('./Node');

/** Singly Linked List with head + tail pointers. Poori app ka data isi mein rehta hai. */
class LinkedList {
  constructor() { this.head = null; this.tail = null; this.size = 0; }

  // ---------- CREATE ----------
  insertAtHead(data) {                 // O(1)
    const node = new Node(data);
    node.next = this.head;
    this.head = node;
    if (!this.tail) this.tail = node;
    this.size++;
    return data;
  }
  insertAtTail(data) {                 // O(1) (tail pointer ki wajah se)
    const node = new Node(data);
    if (!this.head) this.head = this.tail = node;
    else { this.tail.next = node; this.tail = node; }
    this.size++;
    return data;
  }

  // ---------- READ ----------
  findById(id) {                       // O(n)
    for (let cur = this.head; cur; cur = cur.next) if (cur.data.id === id) return cur.data;
    return null;
  }
  find(predicate) {                    // O(n)
    for (let cur = this.head; cur; cur = cur.next) if (predicate(cur.data)) return cur.data;
    return null;
  }
  toArray() {                          // O(n)
    const out = [];
    for (let cur = this.head; cur; cur = cur.next) out.push(cur.data);
    return out;
  }
  filter(fn) { return this.toArray().filter(fn); }   // O(n)

  // ---------- UPDATE ----------
  updateById(id, fields) {             // O(n)
    for (let cur = this.head; cur; cur = cur.next) {
      if (cur.data.id === id) {
        cur.data = { ...cur.data, ...fields, id, updatedAt: new Date().toISOString() };
        return cur.data;
      }
    }
    return null;
  }

  // ---------- DELETE ----------
  deleteById(id) {                     // O(n)
    if (!this.head) return false;
    if (this.head.data.id === id) {    // case 1: head
      this.head = this.head.next;
      if (!this.head) this.tail = null;
      this.size--;
      return true;
    }
    let prev = this.head, cur = this.head.next;   // case 2: middle / tail
    while (cur) {
      if (cur.data.id === id) {
        prev.next = cur.next;
        if (cur === this.tail) this.tail = prev;
        this.size--;
        return true;
      }
      prev = cur; cur = cur.next;
    }
    return false;
  }

  // ---------- EXTRA ----------
  reverse() {                          // O(n)
    let prev = null, cur = this.head;
    this.tail = this.head;
    while (cur) { const nxt = cur.next; cur.next = prev; prev = cur; cur = nxt; }
    this.head = prev;
  }

  sortBy(compareFn) {                  // Merge sort: O(n log n)
    this.head = this._mergeSort(this.head, compareFn);
    let cur = this.head;
    while (cur && cur.next) cur = cur.next;
    this.tail = cur;
  }
  _mergeSort(head, cmp) {
    if (!head || !head.next) return head;
    let slow = head, fast = head.next;              // slow/fast pointer se middle
    while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
    const right = slow.next;
    slow.next = null;
    return this._merge(this._mergeSort(head, cmp), this._mergeSort(right, cmp), cmp);
  }
  _merge(a, b, cmp) {
    const dummy = new Node(null);
    let t = dummy;
    while (a && b) {
      if (cmp(a.data, b.data) <= 0) { t.next = a; a = a.next; }
      else { t.next = b; b = b.next; }
      t = t.next;
    }
    t.next = a || b;
    return dummy.next;
  }

  static fromArray(arr) {
    const list = new LinkedList();
    arr.forEach(item => list.insertAtTail(item));
    return list;
  }
}
module.exports = LinkedList;
