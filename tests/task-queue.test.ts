import { PendingRunMode, TaskQueue } from '../src';
import { delay } from '../src/util';

test('[Concurrent] Basic execution', async () => {
    const tq = new TaskQueue();
    let completeCount = 0;
    const fn = [
        jest.fn(async () => { await delay(100); completeCount++; }), 
        jest.fn(async () => { completeCount++ }), 
        jest.fn(async () => { completeCount++ }), 
        jest.fn(async () => { completeCount++ }), 
        jest.fn(async () => { completeCount++ })
    ];

    fn.forEach(i => tq.add(i));

    // Check that nothing was called yet.
    fn.forEach(i => expect(i.mock.calls.length).toBe(0));

    // Concurrent run.
    const promises = await tq.runPending(PendingRunMode.CONCURRENT);
    
    // Should have called them all but one still running.
    fn.forEach(i => expect(i.mock.calls.length).toBe(1));
    expect(completeCount).toBe(4);

    await promises[0];
    expect(completeCount).toBe(5);
});

test('[Serialized] Basic execution', async () => {
    const tq = new TaskQueue();
    let testString = '';

    const fn = [
        jest.fn(async () => { testString += 'A' }), 
        jest.fn(async () => { testString += 'B' }), 
        jest.fn(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); testString += 'C' }), 
        jest.fn(async () => { testString += 'D' }), 
        jest.fn(async () => { testString += 'E' })
    ];

    fn.forEach(i => tq.add(i));

    // Check that nothing was called yet.
    fn.forEach(i => expect(i.mock.calls.length).toBe(0));

    // Serialized run.
    await tq.runPending();
    
    // Now testString must be ABCDE or something didn't work.
    expect(testString).toBe('ABCDE');
});

test('[Serialized] With error check', async () => {
    const tq = new TaskQueue();
    let testString = '';

    const fn = [
        jest.fn(async () => { testString += 'A' }), 
        jest.fn(async () => { await delay(100); testString += 'B' }), 
        jest.fn(async () => { testString += 'C' }), 
        jest.fn(async () => { throw new Error(); }), 
        jest.fn(async () => { testString += 'D' }), 
        jest.fn(async () => { testString += 'E' })
    ];

    fn.forEach(i => tq.add(i));

    // Check that nothing was called yet.
    fn.forEach(i => expect(i.mock.calls.length).toBe(0));

    // Serialized run.
    await tq.runPending(PendingRunMode.SERIALIZED_UNTIL_ERROR);
    
    // Now testString must be ABC or something didn't work.
    expect(testString).toBe('ABC');
});

test('[Serialized] With error check on sync error', async () => {
    const tq = new TaskQueue();
    let testString = '';

    const fn = [
        jest.fn(async () => { testString += 'A' }), 
        jest.fn(async () => { await delay(100); testString += 'B' }), 
        jest.fn(async () => { testString += 'C' }), 
        jest.fn(() => { throw new Error(); }), 
        jest.fn(async () => { testString += 'D' }), 
        jest.fn(async () => { testString += 'E' })
    ];

    fn.forEach(i => tq.add(i));

    // Check that nothing was called yet.
    fn.forEach(i => expect(i.mock.calls.length).toBe(0));

    // Serialized run.
    await tq.runPending(PendingRunMode.SERIALIZED_UNTIL_ERROR);
    
    // Now testString must be ABC or something didn't work.
    expect(testString).toBe('ABC');
});

test('Clear pending executions', async () => {
    const tq = new TaskQueue();
    let completeCount = 0;
    const fn = [
        jest.fn(async () => { await delay(100); completeCount++; }), 
        jest.fn(async () => { completeCount++ }), 
        jest.fn(async () => { completeCount++ }), 
        jest.fn(async () => { completeCount++ }), 
        jest.fn(async () => { completeCount++ })
    ];

    fn.forEach(i => tq.add(i));

    // Check that nothing was called yet.
    fn.forEach(i => expect(i.mock.calls.length).toBe(0));

    // Cancel pending
    tq.cancelPending();
    await tq.runPending(PendingRunMode.SERIALIZED);
    
    // Check that nothing was called yet.
    fn.forEach(i => expect(i.mock.calls.length).toBe(0));

});