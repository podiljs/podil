## Podil [![Build](https://github.com/podiljs/podil/actions/workflows/build.yaml/badge.svg)](https://github.com/podiljs/podil/actions/workflows/build.yaml) [![npm version](https://img.shields.io/npm/v/podil.svg?style=flat)](https://www.npmjs.com/package/podil)

Lightweight and secure database migration tool for Node.js and Postgres.

### How to use
Install Podil ad pg:

```shell
npm install podil pg
```

Create a `migrations` folder in the folder from which you start your
application (usually the project root) and add `.sql` scripts to it.
```shell
.
├── migrations
│   ├── 001__init_schema.sql
│   ├── 002__add_orders_table.sql
│   └── 003__add_order_status_column.sql
```

In the code, import `podil`:
```shell
import { podil } from 'podil';
```

Add the migration call at the entry point of your application:

```shell
await podil.migrate('postgres://podil:podil@localhost:5432/podil');
```

This will execute all migrations. Note, the SQL files will be executed
in the lexicographical order.

### Configuration

By default, Podil looks for migrations in `./migrations`, you can pass a
custom folder for migrations as a second argument to the `migrate()` call:

```shell
await podil.migrate(
  'postgres://podil:podil@localhost:5432/podil',
  '/app/sql/migrations'
);
```

### Troubleshooting

Podil is in active development. If you found a bug, have a question, or
want to request a new feature, please
[open an issue](https://github.com/podiljs/podil/issues).
