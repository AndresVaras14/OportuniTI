import test from 'node:test';
import assert from 'node:assert/strict';
import { getPagination, OPPORTUNITIES_PER_PAGE } from '../lib/pagination.mjs';

test('pages contain 30 opportunities without gaps or duplicates', () => {
  assert.equal(OPPORTUNITIES_PER_PAGE, 30);
  const records = Array.from({ length: 130 }, (_, index) => index);
  const pages = Array.from({ length: 5 }, (_, index) => {
    const { startIndex, endIndex } = getPagination(records.length, index + 1);
    return records.slice(startIndex, endIndex);
  });
  assert.deepEqual(pages.map(page => page.length), [30, 30, 30, 30, 10]);
  assert.deepEqual(pages.flat(), records);
});

test('empty results and exact page boundaries do not create extra pages', () => {
  assert.deepEqual(getPagination(0), { page: 1, totalPages: 1, startIndex: 0, endIndex: 0 });
  assert.equal(getPagination(30).totalPages, 1);
  assert.equal(getPagination(60).totalPages, 2);
  assert.equal(getPagination(31).totalPages, 2);
});

test('expired or filtered results clamp the current page to the valid range', () => {
  assert.deepEqual(getPagination(31, 5), { page: 2, totalPages: 2, startIndex: 30, endIndex: 31 });
  assert.equal(getPagination(130, 0).page, 1);
  assert.equal(getPagination(130, 99).page, 5);
});
