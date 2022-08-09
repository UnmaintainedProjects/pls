import { type Collection } from "https://deno.land/x/mongo@v0.31.0/mod.ts";
import { Adapter } from "../adapter.ts";

export class MongoAdapter implements Adapter {
  constructor(
    protected collection: Collection<{ key: string; value: string }>,
  ) {
  }

  async setItems(items: Record<string, string>) {
    await this.collection.deleteMany({ key: { $in: Object.keys(items) } });
    await this.collection.insertMany(
      Object.entries(items).map(([k, v]) => ({ key: k, value: v })),
    );
  }

  async getItems() {
    return Object.fromEntries(
      await this.collection.find().map((v) => [v.key, v.value]),
    );
  }

  async deleteItems(items: string[]) {
    await this.collection.deleteMany(items.map((v) => ({ key: v })));
  }
}
