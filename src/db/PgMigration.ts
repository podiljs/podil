import { Client } from 'pg'
import { Script } from './Script'
import { Migration } from './Migration'

export class PgMigration implements Migration {
  private readonly client: Client

  constructor (connectionString: string) {
    this.client = new Client({ connectionString })
  }

  async connect (): Promise<void> {
    await this.client.connect()
  }

  async disconnect (): Promise<void> {
    await this.client.end()
  }

  async initializeMetaTable (): Promise<void> {
    await this.client.query(
      `CREATE TABLE IF NOT EXISTS 
       podil_migrations (
        name VARCHAR(255) PRIMARY KEY,
        checksum CHAR(64) NOT NULL
      )`,
    )
  }

  async fetchAppliedMigrations (): Promise<Script[]> {
    const result = await this.client.query('SELECT name, checksum FROM podil_migrations ORDER BY name')
    return result.rows.map((row) => ({
      name: row.name,
      checksum: row.checksum
    }))
  }

  async executeSql (sql: string): Promise<void> {
    await this.client.query(sql)
  }

  async updateVersion (fileName: string, checksum: string): Promise<void> {
    await this.client.query(
      'INSERT INTO podil_migrations(name, checksum) VALUES($1, $2)',
      [fileName, checksum],
    )
  }
}
