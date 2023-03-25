import { initDatabase } from './config'
import { Client } from 'pg'
import assert from 'assert'
import { PgMigration } from '../src/db/PgMigration'
import type { StartedTestContainer } from 'testcontainers'

describe('PgMigration', async () => {
  let container: StartedTestContainer
  let connectionString: string
  let client: Client

  before('Start DB', async () => {
    const config = await initDatabase()
    container = config.container
    connectionString = config.connectionString
  })

  beforeEach('Clean DB', async () => {
    client = new Client({ connectionString })
    await client.connect()
    await client.query('DROP TABLE IF EXISTS podil_migrations')
    await client.query('DROP TABLE IF EXISTS execute_script_test')
  })

  afterEach('Close connection', async () => {
    await client.end()
  })

  after('Stop DB', async () => {
    await container.stop()
  })

  it('initializeMetaTable', async () => {
    const migration = new PgMigration(connectionString)
    await migration.connect()
    try {
      await migration.initializeMetaTable()

      const result = await client.query('SELECT name FROM podil_migrations')
      assert.strictEqual(result.rows.length, 0)
    } finally {
      await migration.disconnect()
    }
  })

  it('executeScript', async () => {
    const migration = new PgMigration(connectionString)
    await migration.connect()
    try {
      await client.query('CREATE TABLE podil_migrations (name VARCHAR(255) PRIMARY KEY)')

      await migration.executeSql('CREATE TABLE execute_script_test (name VARCHAR(255))')

      const result = await client.query('SELECT name FROM execute_script_test')
      assert.strictEqual(result.rows.length, 0)
    } finally {
      await migration.disconnect()
    }
  })

  it('updateVersion', async () => {
    const migration = new PgMigration(connectionString)
    await migration.connect()
    try {
      await client.query('CREATE TABLE IF NOT EXISTS podil_migrations (name VARCHAR(255) PRIMARY KEY, checksum CHAR(64) NOT NULL)')

      await migration.updateVersion('001__inti.sql', '57a009a0f6f49553ab774d0875f9833d2bc8cd484e0bc4b6be89fcabfa94fba7')

      const result = await client.query('SELECT name, checksum FROM podil_migrations')
      assert.strictEqual(result.rows[0].name, '001__inti.sql')
      assert.strictEqual(result.rows[0].checksum, '57a009a0f6f49553ab774d0875f9833d2bc8cd484e0bc4b6be89fcabfa94fba7')
    } finally {
      await migration.disconnect()
    }
  })
})
