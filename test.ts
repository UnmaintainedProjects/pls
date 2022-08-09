import {
  assertEquals,
  assertExists,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.151.0/testing/asserts.ts";
import { Adapter } from "./adapter.ts";
import { flush, setup } from "./mod.ts";

const testAdapter = new class implements Adapter {
  items: Record<string, string> = {};

  setItems(items: Record<string, string>) {
    this.items = items;
  }

  getItems() {
    return this.items;
  }

  deleteItems(items: string[]) {
    this.items = Object.fromEntries(
      Object.entries(this.items).filter(([k]) => !items.includes(k)),
    );
  }
}();

function wait(duration = 10) {
  return new Promise((r) => setTimeout(r, duration));
}

function flushAndWait() {
  flush();
  return wait();
}

Deno.test("errors", async (t) => {
  await t.step("flush before setup", () => {
    assertThrows(flush);
  });
  await t.step("TTL smaller than or equal to zero", () => {
    assertRejects(() => setup({ adapter: testAdapter, ttl: -0 }));
    assertRejects(() => setup({ adapter: testAdapter, ttl: -1 }));
  });
});

Deno.test("opearations", async (t) => {
  localStorage.clear();
  await setup({ adapter: testAdapter, ttl: null });
  await t.step("set", async () => {
    localStorage.setItem("test_key", "test_value");
    localStorage.setItem("test_key2", "test_value2");
    localStorage.setItem("test_key3", "test_value3");
    await flushAndWait();
    assertEquals(
      Object.fromEntries(Object.entries(localStorage)),
      testAdapter.items,
    );
  });
  await t.step("update", async () => {
    localStorage.setItem("test_key2", "test_value3");
    localStorage.setItem("test_key3", "test_value2");
    await flushAndWait();
    assertEquals(testAdapter.items["test_key2"], "test_value3");
    assertEquals(testAdapter.items["test_key3"], "test_value2");
  });
  await t.step("delete", async () => {
    localStorage.removeItem("test_key");
    await flushAndWait();
    assertThrows(() => assertExists(testAdapter.items["test_key"]));
  });
});

Deno.test("opearations with TTL", async () => {
  localStorage.clear();
  testAdapter.items = {};
  // WARNING: Do NOT use a TTL as low as 50. This is only for testing purposes.
  await setup({ adapter: testAdapter, ttl: 50 });
  localStorage.setItem("test_key", "test_value");
  const fn0 = () =>
    assertEquals(
      Object.fromEntries(Object.entries(localStorage)),
      testAdapter.items,
    );
  await wait(10);
  assertThrows(fn0);
  await wait(50);
  fn0();
  await setup({ adapter: testAdapter, ttl: null });
});

Deno.test("include/exclude", async (t) => {
  localStorage.clear();
  testAdapter.items = {};
  const rest = { adapter: testAdapter, ttl: null };
  await t.step("exclude", async () => {
    await setup({
      exclude: [/_excl$/, "notSomething"],
      ...rest,
    });
    localStorage.setItem("._excll", "test_value0");
    localStorage.setItem(".._excl", "test_value1");
    localStorage.setItem("___excl", "test_value2");
    localStorage.setItem("notSometh1ng", "test_value3");
    localStorage.setItem("notSomething", "test_value4");
    await flushAndWait();
    assertExists(testAdapter.items["._excll"]);
    assertThrows(() => assertExists(testAdapter.items[".._excl"]));
    assertThrows(() => assertExists(testAdapter.items["___excl"]));
    assertExists(testAdapter.items["notSometh1ng"]);
    assertThrows(() => assertExists(testAdapter.items["notSomething"]));
  });
  await t.step("include", async () => {
    await setup({
      include: [/^incl_/, "yetSomething"],
      ...rest,
    });
    localStorage.setItem("incll_.", "test_value0");
    localStorage.setItem("incl_..", "test_value1");
    localStorage.setItem("incl___", "test_value2");
    localStorage.setItem("yetSometh1ng", "test_value3");
    localStorage.setItem("yetSomething", "test_value4");
    await flushAndWait();
    assertThrows(() => assertExists(testAdapter.items["incll_."]));
    assertExists(testAdapter.items["incl_.."]);
    assertExists(testAdapter.items["incl___"]);
    assertThrows(() => assertExists(testAdapter.items["yetSometh1ng"]));
    assertExists(testAdapter.items["yetSomething"]);
  });
  await t.step("both", async () => {
    await setup({
      include: [/^incl_/],
      exclude: ["incl_s", /[0-9]/],
      ...rest,
    });
    localStorage.setItem("incl_y", "test_value0");
    localStorage.setItem("incl_n", "test_value1");
    localStorage.setItem("incl_s", "test_value2");
    localStorage.setItem("incl_0", "test_value3");
    await flushAndWait();
    assertExists(testAdapter.items["incl_y"]);
    assertExists(testAdapter.items["incl_n"]);
    assertThrows(() => assertExists(testAdapter.items["incl_s"]));
    assertThrows(() => assertExists(testAdapter.items["incl_0"]));
  });
});
