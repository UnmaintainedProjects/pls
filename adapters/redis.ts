import { Redis } from "https://deno.land/x/redis@v0.26.0/mod.ts";
import { Adapter } from "../adapter.ts";

export class RedisAdapter implements Adapter {
  constructor(protected redis: Redis) {
  }

  async setItems(items: Record<string, string>) {
    const pipeline = this.redis.pipeline();
    for (const [k, v] of Object.entries(items)) {
      pipeline.set(`ls__${k}`, v);
    }
    await pipeline.flush();
  }

  async getItems() {
    const pipeline = this.redis.pipeline();
    const keys = await this.redis.keys("ls__*");
    for (const key of keys) {
      pipeline.get(key);
    }
    const values = await pipeline.flush();
    return Object.fromEntries(
      values.map((v, i) => [keys[i].slice(4), v]).filter(([v]) =>
        typeof v === "string"
      ),
    );
  }

  async deleteItems(items: string[]) {
    items = items.map((v) => `ls__${v}`);
    const pipeline = this.redis.pipeline();
    for (const item of items) {
      pipeline.del(item);
    }
    await pipeline.flush();
  }
}
