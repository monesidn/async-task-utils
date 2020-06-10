import { TaskSerializer } from "../src";
import { delay } from "../src/util";

test('Basic execution', async () => {
    const ts = new TaskSerializer();
    let testString = '';

    const fn = [
        jest.fn(async () => { await delay(100); testString += 'A'; }), 
        jest.fn(async () => { await delay(20); testString += 'B'; }), 
        jest.fn(async () => { await delay(10); testString += 'C'; })
    ];

    fn.forEach(i => ts.add(i));

    // Check that only the first was already called.
    expect(fn[0].mock.calls.length).toBe(1);
    expect(fn[1].mock.calls.length).toBe(0);
    expect(fn[2].mock.calls.length).toBe(0);

    // Wait for execution to finish.
    await delay(200);

    // Should have called them all in the right order.
    fn.forEach(i => expect(i.mock.calls.length).toBe(1));
    expect(testString).toBe('ABC');

    // Also make sure that pushing something now processing resumes.
    ts.add(jest.fn(async () => { await delay(20); testString += 'D'; }));

    // Wait for execution to finish.
    await delay(30);
    expect(testString).toBe('ABCD');
});

test('Multi key execution', async () => {
    const ts = new TaskSerializer();
    let testString1 = '';
    let testString2 = '';

    const fn1 = [
        jest.fn(async () => { await delay(100); testString1 += 'A'; }), 
        jest.fn(async () => { await delay(20); testString1 += 'B'; }), 
        jest.fn(async () => { await delay(10); testString1 += 'C'; })
    ];

    const fn2 = [
        jest.fn(async () => { await delay(10); testString2 += 'D'; }), 
        jest.fn(async () => { await delay(20); testString2 += 'E'; }), 
        jest.fn(async () => { await delay(100); testString2 += 'F'; })
    ];

    fn1.forEach(i => ts.add('key1', i));
    fn2.forEach(i => ts.add('key2', i));

    // Wait for execution to finish.
    await delay(200);

    expect(testString1).toBe('ABC');
    expect(testString2).toBe('DEF');
});