## Podil [![Build](https://github.com/podiljs/podil/actions/workflows/build.yaml/badge.svg)](https://github.com/podiljs/podil/actions/workflows/build.yaml) [![npm version](https://img.shields.io/npm/v/podil.svg?style=flat)](https://www.npmjs.com/package/podil) [![install size](https://packagephobia.com/badge?p=podil)](https://www.npmjs.com/package/podil)

Lightweight and secure database migration tool for Node.js and Postgres. Podil lets
you version your database by executing plain sql scripts automatically on application
startup. It keeps track of what scripts have been executed and what not which lets
you seemlesly update your database schema on every environemnt in the same way. Podil
saves you from mistakingly break your schema by storing and verifying checkusms of every
script that it executed.


### How to use
Install Podil and pg:

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

Podil can be configured to look for migration scripts in an arbitary location.
By default, it looks for migrations in `./migrations`, you can pass a custom
folder in the follwoing way:

```shell
await podil.migrate(connectionString, { migrationsDir: '/path/to/your/migrations' });
```

It is recomended to verify checksums of your scripts on every run. However,
you can disable checkusm verification using the `verifyChecksum` property:

```shell
await podil.migrate(connectionString, { verifyChecksum: false });
```

### Troubleshooting

Podil is in active development. If you found a bug, have a question or
want to request a new feature, please
[open an issue](https://github.com/podiljs/podil/issues).
