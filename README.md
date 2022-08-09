# PLS [![](https://shield.deno.dev/x/pls)](https://deno.land/x/pls)

> Preserve `localStorage` in databases.

## Features

- No adapter dependency is loaded by default.
- Possible to write/contribute your own adapters.
- Currently providing ready-to-use adapters for MongoDB, PostgreSQL and Redis.

## Get Started

```ts
import { setup } from "https://deno.land/x/pls/mod.ts";
```

### Automatic

You can set the `PLS_CONNECTION_URI` environment variable to a MongoDB,
PostgreSQL or Redis connnection URI, and simply call `setup()` without any
arguments:

```ts
await setup();
```

### MongoDB

```ts
import { MongoClient } from "https://deno.land/x/mongo/mod.ts";
import { MongoAdapter } from "https://deno.land/x/pls/adapters/mongo.ts";

const client = new MongoClient();

...
await client.connect(...)
...

const collection = client.database("deno").collection("localStorage");

await setup({
  adapter: new MongoAdapter(collection),
});
```

### PostgreSQL

```ts
import { Client } from "https://deno.land/x/postgres/mod.ts";
import { PostgresAdapter } from "https://deno.land/x/pls/adapters/postgres.ts";

const client = new Client(...);

...
await client.connect()
...

const table = "localStorage";

await setup({
  adapter: await new PostgresAdapter(client, table).initialize(),
});
```

### Redis

```ts
import { connect } from "https://deno.land/x/redis/mod.ts";
import { RedisAdapter } from "https://deno.land/x/pls/adapters/redis.ts";

const redis = await connect(...);

await setup({
  adapter: new RedisAdapter(redis),
});
```

After that, you’ll just use `localStorage` as you normally would, and...

Everything will be synchronized with your database!

## TTL

By default, `localStorage` will be checked every 20 seconds to see if there were
any changes were made to it, and if there were, they will get pushed to the
database adapter you provided when calling `setup()`.

You can configure the duration, or just disable it and call the flush method
whenever you like.

### Configuring

```ts
await setup({
  ttl: 30000, // in milliseconds
});
```

> Note that you should not set it too low, otherwise you may face unexpected
> problems.

### Disabling

```ts
await setup({ ttl: null });
```

You can then call `flush()` whenever you’d liked to synchronize:

```ts
import { flush } from "https://deno.land/x/pls/mod.ts";

flush();
```

## Including/excluding

You can decide on which keys of pattern of keys should be included or excluded
when persisting them:

```ts
await setup({
  include: ["someSpecificKeyToInclude", /^someRegExpToInclude/],
  exclude: ["someSpecificKeyToExclude", /someRegExpToExclude$/],
});
```

---

Written by [@roj1512](https://github.com/roj1512). Under [WTFPL](./LICENSE).
