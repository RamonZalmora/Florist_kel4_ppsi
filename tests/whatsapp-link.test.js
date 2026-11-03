import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whatsappUrl } from '../web/src/api.js';

test('WhatsApp links normalize Indonesian and explicit international phone numbers', () => {
  for (const phone of [
    '0812-3456-7888',
    '0812 3456 7888',
    '81234567888',
    '6281234567888',
    '+62 812 3456 7888',
    '006281234567888',
  ]) {
    assert.equal(whatsappUrl(phone), 'https://wa.me/6281234567888');
  }
  assert.equal(whatsappUrl('+1 202 555 0199'), 'https://wa.me/12025550199');
  for (const phone of ['', null, 'abc', '0123', '+0123456789', '0812345678901234567890'])
    assert.equal(whatsappUrl(phone), '');
});
