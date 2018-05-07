# tape-modern

Minimum viable testing framework:

* TAP compliant
* Works in Node and in browsers
* Everything is assumed to be async — no need to faff around with `t.plan` and `t.end`

It requires Node 7.6+, because it uses `async`/`await`.


## Installation

```bash
npm i -D tape-modern
```


## Usage

```js
const { test } = require('tape-modern');

test('these tests will all pass', t => {
	t.ok(true);
	t.ok(true, 'this time with an optional message');
	t.ok('not true, but truthy enough');

	t.equal(1 + 1, 2);
	t.equal(Math.max(1, 2, 3), 3);

	t.throws(() => {
		throw new Error('oh no!');
	}, /oh no!/);

	t.pass('this too shall pass');
});

test('these tests will not pass', t => {
	t.equal(42, '42');
	t.equal({}, {});
	t.fail('womp womp');
});

test.skip('this test will not run', t => {
	t.pass(false);
});
```

You can create custom assertions by adding methods to `assert`:

```js
const { test, assert } = require('tape-modern');

assert.isArray = (value, msg = 'should be an array') => {
	assert.ok(Array.isArray(value), msg);
};

assert.isNotArray = (value, msg = 'should not be an array') => {
	assert.ok(!Array.isArray(value), msg);
};

test('things that are array-like', t => {
	const divs = document.getElementsByTagName('div');

	t.isNotArray(divs);
	t.isArray([...divs]);
});
```

To run (a) selected test(s), use `test.only`:

```js
test('this test will not run', t => {
	// ...
});

test.only('this test will run', t => {
	// ...
});

test.only('so will this', t => {
	// ...
});
```

To skip a test, use `test.skip`:

```js
test.skip('this test will be skipped', t => {
	// ...
});
```

You can check when your tests have finished running with the `done` promise:

```js
const { done } = require('tape-modern');

// make it visible to e.g. Puppeteer, so that
// we can do `await page.evaluate(() => done)`
window.done = done;
```


## License

[LIL](LICENSE)