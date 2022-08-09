import { Client } from "https://deno.land/x/postgres@v0.16.1/mod.ts";
import { Adapter } from "../adapter.ts";

export class PostgresAdapter implements Adapter {
  constructor(protected client: Client, protected table: string) {
  }

  // Credits to @Satont for his awesome work in grammyjs/storages
  async initialize() {
    await this.client.queryArray(`CREATE TABLE IF NOT EXISTS "${this.table}" (
      key VARCHAR NOT NULL,
      value TEXT
    )`);
    await this.client
      .queryArray(
        `CREATE UNIQUE INDEX IF NOT EXISTS IDX_${this.table} ON "${this.table}" (key)`,
      );
    return this;
  }

  async setItems(items: Record<string, string>) {
    const keys = Object.keys(items);
    const entries = Object.entries(items);
    await this.client.queryArray(
      `DELETE FROM "${this.table}" WHERE key IN (${
        keys.map((_, i) => `$${i + 1}`)
      })` as unknown as TemplateStringsArray,
      ...keys,
    );
    let pi = 1;
    let parameters = "";
    for (let i = 0; i < entries.length; i++) {
      parameters += `($${pi}`;
      pi++;
      parameters += `, $${pi}), `;
    }
    parameters = parameters.slice(0, -2);
    await this.client.queryArray(
      `INSERT INTO "${this.table}" (key, value) VALUES ${parameters}` as unknown as TemplateStringsArray,
      ...entries.flat(),
    );
  }

  async getItems() {
    return Object.fromEntries(
      (await this.client.queryArray(`SELECT * FROM "${this.table}"`)).rows,
    );
  }

  async deleteItems(items: string[]) {
    await this.client.queryArray`DELETE FROM ${this.table} WHERE key IN (${
      Object.keys(items)
    });`;
  }
}
