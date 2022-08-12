import { Adapter } from "./adapter.ts";

export interface Config {
  /**
   * Persistent storage adapter
   */
  adapter?: Adapter;
  /**
   * Time to live in milliseconds or null to disable automated flushing
   * @default 20000
   */
  ttl?: number | null;
  /**
   * Keys or key patterns to include and persist
   * If provided, only matching keys will be included.
   */
  include?: (string | RegExp)[];
  /**
   * Keys or key patterns to always exclude and not persist
   */
  exclude?: (string | RegExp)[];
}

interface InternalConfig extends Config {
  interval?: number;
  include: NonNullable<Config["include"]>;
  previousItems?: Record<string, string>;
}

const config: InternalConfig = { include: [/^.+$/] };

function isIncluded(key: string) {
  if (config.exclude) {
    for (const item of config.exclude) {
      if (typeof item === "string" ? key == item : item.test(key)) {
        return false;
      }
    }
  }
  for (const item of config.include) {
    if (typeof item === "string" ? key == item : item.test(key)) {
      return true;
    }
  }
  return false;
}

export async function setup(config_?: Config) {
  if (typeof config_?.ttl === "number" && config_.ttl <= 0) {
    throw new Error("TTL must be greater than zero");
  }
  if (typeof config_?.ttl === "number" && config_.ttl < 5000) {
    console.warn("TTL is too low which might lead to unexpected outcomes");
  }
  if (typeof config.interval !== "undefined") {
    clearInterval(config.interval);
  }
  if (config_?.adapter) {
    config.adapter = config_.adapter;
  } else {
    const uri = Deno.env.get("PLS_CONNECTION_URI");
    if (uri) {
      let url: URL | undefined;
      try {
        url = new URL(uri);
      } catch (_err) {
        //
      }
      if (url) {
        switch (url.protocol) {
          case "mongodb:": {
            const { MongoClient } = await import(
              "https://deno.land/x/mongo@v0.31.0/mod.ts"
            );
            const client = new MongoClient();
            await client.connect(uri);
            const { MongoAdapter } = await import("./adapters/mongo.ts");
            config.adapter = new MongoAdapter(
              client.database().collection("ls"),
            );
            break;
          }
          case "postgres:":
          case "postgresql:": {
            const { Client } = await import(
              "https://deno.land/x/postgres@v0.16.1/mod.ts"
            );
            const client = new Client(uri);
            await client.connect();
            const { PostgresAdapter } = await import("./adapters/postgres.ts");
            config.adapter = await new PostgresAdapter(client, "ls")
              .initialize();
            break;
          }
          case "redis:": {
            const { connect, parseURL } = await import(
              "https://deno.land/x/redis@v0.26.0/mod.ts"
            );
            const redis = await connect(parseURL(uri));
            const { RedisAdapter } = await import("./adapters/redis.ts");
            config.adapter = new RedisAdapter(redis);
            break;
          }
        }
      }
    }
  }
  if (!config.adapter) {
    throw new Error(
      "PLS_CONNECTION_URI is not set, invalid or not supported",
    );
  }
  config.ttl = typeof config_?.ttl !== "undefined" ? config_.ttl : 20000;
  if (config_?.include) {
    config.include = config_.include;
  }
  config.exclude = config_?.exclude;
  const items = Object.entries(await config.adapter.getItems());
  if (items.length != 0) {
    for (const [k, v] of items) {
      localStorage.setItem(k, v);
    }
    config.previousItems = Object.fromEntries(Object.entries(localStorage));
  }
  if (typeof config.ttl === "number") {
    config.interval = setInterval(() => flush_(), config.ttl);
  }
}

function flush_() {
  const { adapter } = config;
  if (!adapter) {
    throw new Error("Cannot flush before setting up");
  }
  Promise.resolve().then(async () => {
    const { previousItems } = config;
    const currentItems = Object.fromEntries(Object.entries(localStorage));
    let toSet = Object.entries(currentItems).filter(([k]) => isIncluded(k));
    toSet = previousItems
      ? toSet.filter(([k, v]) =>
        previousItems[k] == undefined || previousItems[k] != v
      )
      : toSet;
    const toDelete = previousItems
      ? Object.keys(previousItems).filter((v) =>
        !Object.keys(currentItems).includes(v)
      )
      : [];
    if (toSet.length != 0) {
      await adapter.setItems(Object.fromEntries(toSet));
    }
    if (toDelete.length != 0) {
      await adapter.deleteItems(toDelete);
    }
    config.previousItems = currentItems;
  }).catch((err) => console.warn("Could not flush localStorage:", err));
}

export function flush() {
  if (typeof config.ttl == "number") {
    throw new Error("Cannot flush with a TTL set");
  }
  flush_();
}
