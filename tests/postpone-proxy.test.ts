import { postponeProxy } from "../src";

test('basic job', async () => {
    const target = {
        method1: jest.fn(),
        method2: jest.fn()
    };

    const proxy = postponeProxy(target);
    proxy.method1();
    proxy.method2();

    expect(target.method1.mock.calls.length).toBe(0);
    expect(target.method2.mock.calls.length).toBe(0);

    await proxy.flush();

    expect(target.method1.mock.calls.length).toBe(1);
    expect(target.method2.mock.calls.length).toBe(1);
});

test('clean method', async () => {
    const target = {
        method1: jest.fn(),
        method2: jest.fn()
    };

    const proxy = postponeProxy(target);
    proxy.method1();
    proxy.method2();

    expect(target.method1.mock.calls.length).toBe(0);
    expect(target.method2.mock.calls.length).toBe(0);

    proxy.clear();
    await proxy.flush();

    expect(target.method1.mock.calls.length).toBe(0);
    expect(target.method2.mock.calls.length).toBe(0);
    
    proxy.method2();
    await proxy.flush();

    expect(target.method1.mock.calls.length).toBe(0);
    expect(target.method2.mock.calls.length).toBe(1);

});

test('getProxy() method', async () => {
    const target = {
        method1: jest.fn(),
        method2: jest.fn()
    };

    const proxy = postponeProxy(target);
    expect(proxy.getProxy()).toBeDefined();
});