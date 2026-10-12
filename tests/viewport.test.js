'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');

var html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('viewport keeps the mobile width and initial scale without restricting zoom', function () {
  var viewportTags = html.match(/<meta\b[^>]*name=["']viewport["'][^>]*>/gi) || [];

  assert.equal(viewportTags.length, 1, 'exactly one viewport meta tag exists');
  assert.match(viewportTags[0], /content=["'][^"']*\bwidth=device-width\b[^"']*["']/i);
  assert.match(viewportTags[0], /content=["'][^"']*\binitial-scale=1\.0\b[^"']*["']/i);
  assert.doesNotMatch(viewportTags[0], /\bmaximum-scale\s*=/i);
  assert.doesNotMatch(viewportTags[0], /\buser-scalable\s*=\s*no\b/i);
});
