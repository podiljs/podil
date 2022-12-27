import { StartedTestContainer } from 'testcontainers/dist/test-container'
import { initDatabase } from './config'
import { podil } from '../src'
import { Client } from 'pg'
import assert from 'assert'

describe('Podil', async () => {
  let container: StartedTestContainer
  let connectionString: string
  let client: Client

  before('Start DB container', async () => {
    const config = await initDatabase()
    container = config.container
    connectionString = config.connectionString
  })

  after('Stop DB container', async () => await container.stop())

  beforeEach('Init connection and drop all tables', async () => {
    client = new Client({ connectionString })
    await client.connect()
    await client.query('DROP TABLE IF EXISTS podil_migrations')
    await client.query('DROP TABLE IF EXISTS test_table')
  })

  afterEach('Close connection', async () => await client.end())

  it('should apply migration', async () => {
    // when
    await podil.migrate(connectionString, { migrationsDir: './test/PodilTest/single_migration' })

    // then
    const result = await client.query('SELECT name FROM test_table')
    const nameFromDb = result.rows[0].name
    assert.strictEqual(nameFromDb, 'test data')
  })

  it('should apply multiple migrations', async () => {
    // when
    await podil.migrate(connectionString, { migrationsDir: './test/PodilTest/two_migrations' })

    // then
    const result = await client.query('SELECT test FROM test_table')
    const nameFromDb = result.rows[0].test
    assert.strictEqual(nameFromDb, 'value from the second script')
  })

  it('should apply migration when there are applied scripts', async () => {
    // given
    await client.query(
      `CREATE TABLE IF NOT EXISTS
           podil_migrations
       (
           name     VARCHAR(255) PRIMARY KEY,
           checksum CHAR(64) NOT NULL
       )`,
    )
    await client.query(
      'INSERT INTO podil_migrations(name, checksum) VALUES($1, $2)',
      ['01__init.sql', '06ea2d756243a1e96ebf74d971812d3fe678b6888108bc44b929ae0e560f0924'],
    )

    // when
    await podil.migrate(connectionString, { migrationsDir: './test/PodilTest/two_migrations' })

    // then
    const result = await client.query('SELECT name FROM test_table')
    const nameFromDb = result.rows[0].name
    assert.strictEqual(nameFromDb, 'test data')
  })

  it('should fail to apply migration when checksum check fails', async () => {
    // given
    await client.query(
      `CREATE TABLE IF NOT EXISTS
           podil_migrations
       (
           name     VARCHAR(255) PRIMARY KEY,
           checksum CHAR(64) NOT NULL
       )`,
    )
    await client.query(
      'INSERT INTO podil_migrations(name, checksum) VALUES($1, $2)',
      ['01__init.sql', '0000000000000000000000000000000000000000000000000000000000000000'],
    )
    try {
      // when
      await podil.migrate(connectionString, { migrationsDir: './test/PodilTest/two_migrations' })
      assert.fail('migration is expected to fail with checksum mismatch error')
    } catch (e) {
      // then
      assert.strictEqual(e.toString(), 'Error: Checksum mismatch: File 01__init.sql is expected to have checksum 0000000000000000000000000000000000000000000000000000000000000000 but the calculated checksum is 06ea2d756243a1e96ebf74d971812d3fe678b6888108bc44b929ae0e560f0924.')
    }
  })

  it('should fail to apply migration given fewer migrations then in the database', async () => {
    // given
    await client.query(
      `CREATE TABLE IF NOT EXISTS
           podil_migrations
       (
           name     VARCHAR(255) PRIMARY KEY,
           checksum CHAR(64) NOT NULL
       )`,
    )
    await client.query(
      'INSERT INTO podil_migrations(name, checksum) VALUES ($1, $2), ($3, $4), ($5, $6)',
      [
        '01__init.sql',
        '0000000000000000000000000000000000000000000000000000000000000000',
        '02__test1.sql',
        '0000000000000000000000000000000000000000000000000000000000000000',
        '03__test2.sql',
        '0000000000000000000000000000000000000000000000000000000000000000',
      ],
    )
    try {
      // when
      await podil.migrate(connectionString, { migrationsDir: './test/PodilTest/two_migrations' })
      assert.fail('migration is expected to fail because the database has more migrations than there are in the file system')
    } catch (e) {
      // then
      assert.strictEqual(e.toString(), 'Error: Migrations mismatch: the database has 3 applied scripts but found 2 scripts in the file system.')
    }
  })

  it('should fail to apply migration given wrong script name', async () => {
    // given
    await client.query(
      `CREATE TABLE IF NOT EXISTS
           podil_migrations
       (
           name     VARCHAR(255) PRIMARY KEY,
           checksum CHAR(64) NOT NULL
       )`,
    )
    await client.query(
      'INSERT INTO podil_migrations(name, checksum) VALUES ($1, $2), ($3, $4)',
      [
        '01__init.sql',
        '06ea2d756243a1e96ebf74d971812d3fe678b6888108bc44b929ae0e560f0924',
        '02__wrong_name.sql',
        '0000000000000000000000000000000000000000000000000000000000000000',
      ],
    )
    try {
      // when
      await podil.migrate(connectionString, { migrationsDir: './test/PodilTest/two_migrations' })
      assert.fail('migration is expected to fail because the second script name does not mach the value in the database')
    } catch (e) {
      // then
      assert.strictEqual(e.toString(), 'Error: Migrations mismatch: found 02__wrong_name.sql in the DB but the next script in the filesystem is 02__alter_table.sql.')
    }
  })

  it('should apply migration when checksum verification is disabled', async () => {
    // given
    await client.query(
      `CREATE TABLE IF NOT EXISTS
           podil_migrations
       (
           name     VARCHAR(255) PRIMARY KEY,
           checksum CHAR(64) NOT NULL
       )`,
    )
    await client.query('CREATE TABLE test_table (name VARCHAR(255) PRIMARY KEY)')
    await client.query(`INSERT INTO test_table values ('test data')`)
    await client.query(
      'INSERT INTO podil_migrations(name, checksum) VALUES ($1, $2)',
      [
        '01__init.sql',
        'wrong-checksum',
      ],
    )
    // when
    await podil.migrate(connectionString, {
      migrationsDir: './test/PodilTest/two_migrations',
      verifyChecksum: false,
    })

    // then
    const result = await client.query('SELECT test FROM test_table')
    const nameFromDb = result.rows[0].test
    assert.strictEqual(nameFromDb, 'value from the second script')
  })
})
