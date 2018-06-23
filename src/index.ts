let fulfil: () => void;
export const done = new Promise(f => {
	fulfil = f;
});

function start() {
	if (!running) {
		running = true;
		console.log('TAP version 13');

		Promise.resolve().then(() => {
			const hasOnly = tests.some(test => test.only);
			tests.forEach(test => {
				test.shouldRun = test.skip
					? false
					: hasOnly ? test.only : true;
			});

			dequeue();
		});
	}
}

export const test = Object.assign(function test(name: string, fn: (t: Assertions) => Promise<void> | void) {
	tests.push({ name, fn, skip: false, only: false, shouldRun: false });
	start();
}, {
	skip(name: string, fn: (t: Assertions) => Promise<void> | void) {
		tests.push({ name, fn, skip: true, only: false, shouldRun: null });
		start();
	},

	only(name: string, fn: (t: Assertions) => Promise<void> | void) {
		tests.push({ name, fn, skip: false, only: true, shouldRun: null });
		start();
	}
});

let testIndex = 0;
let assertIndex = 0;
let running = false;

export type Assertions = {
	fail: (msg?: string) => void;
	pass: (msg?: string) => void;
	ok: (value: any, msg?: string) => void;
	equal: (a: any, b: any, msg?: string) => void;
	throws: (fn: () => any, err: any, msg?: string) => void;
}

export type Test = {
	name: string;
	fn: (t: Assertions) => Promise<void> | void;
	skip: boolean;
	only: boolean;
	shouldRun: boolean;
}

const tests: Test[] = [];
let passed = 0;
let failed = 0;
let skipped = 0;

const isNode = typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]';

function logResult(ok: boolean, operator: string, msg: string, info: { actual?: any, expected?: any } = {}) {
	assertIndex += 1;
	if (ok) {
		console.log(`ok ${assertIndex} — ${msg}`);
		passed += 1;
	} else {
		console.log(`not ok ${assertIndex} — ${msg}`);
		failed += 1;

		console.log('  ---');
		console.log(`  operator: ${operator}`);

		if (isNode) {
			const util = require('util');
			if ('expected' in info) console.log(`  expected:\n    ${util.format(info.expected).replace(/\n/gm, `\n    `)}`);
			if ('actual'   in info) console.log(`  actual:\n    ${util.format(info.actual).replace(/\n/gm, `\n    `)}`);
		} else {
			if ('expected' in info) console.log(`  expected:`, info.expected);
			if ('actual'   in info) console.log(`  actual:`, info.actual);
		}

		// find where the error occurred, and try to clean it up
		let lines = new Error().stack.split('\n').slice(3);
		let cwd = '';

		if (isNode) {
			cwd = process.cwd();
			if (/[\/\\]/.test(cwd[0])) cwd += cwd[0];

			const dirname = typeof __dirname === 'string' && __dirname.replace(/dist$/, '');

			for (let i = 0; i < lines.length; i += 1) {
				if (~lines[i].indexOf(dirname)) {
					lines = lines.slice(0, i);
					break;
				}
			}
		}

		const stack = lines
			.map(line => `    ${line.replace(cwd, '').trim()}`)
			.join('\n');

		console.log(`  stack:   \n${stack}`);
		console.log(`  ...`);
	}
}

export const assert: Assertions = {
	fail: (msg) => logResult(false, 'fail', msg),

	pass: (msg) => logResult(true, 'pass', msg),

	ok: (value, msg = 'should be truthy') => logResult(Boolean(value), 'ok', msg, {
		actual: value,
		expected: true
	}),

	equal: (a, b, msg = 'should be equal') => logResult(a === b, 'equal', msg, {
		actual: a,
		expected: b
	}),

	throws: (fn, expected, msg = 'should throw') => {
		try {
			fn();
			logResult(false, 'throws', msg, {
				expected
			});
		} catch (err) {
			if (expected instanceof Error) {
				logResult(err.name === expected.name, 'throws', msg, {
					actual: err.name,
					expected: expected.name
				});
			} else if (expected instanceof RegExp) {
				logResult(expected.test(err.toString()), 'throws', msg, {
					actual: err.toString(),
					expected: expected
				});

			} else if (typeof expected === 'function') {
				logResult(expected(err), 'throws', msg, {
					actual: err
				});
			}

			else {
				throw new Error(`Second argument to t.throws must be an Error constructor, regex, or function`);
			}
		}
	}
};

async function dequeue() {
	const test = tests[testIndex++];

	if (test) {
		if (!test.shouldRun) {
			if (test.skip) {
				console.log(`# skip ${test.name}`);
			}
			skipped += 1;
			dequeue();
			return;
		}

		console.log(`# ${test.name}`);

		try {
			await test.fn(assert);
		} catch (err) {
			failed += 1;
			console.log(`not ok ${assertIndex} — ${err.message}`);
			console.error(`  ${err.stack.replace(/^\s+/gm, '    ')}`);
		}

		dequeue();
	} else {
		// summarise
		const total = passed + failed + skipped;
		console.log(`\n1..${total}`);
		console.log(`# tests ${total}`);
		if (passed) console.log(`# pass ${passed}`);
		if (failed) console.log(`# fail ${failed}`);
		if (skipped) console.log(`# skip ${skipped}`);

		fulfil();
		if (isNode) process.exit(failed ? 1 : 0);
	}
}
