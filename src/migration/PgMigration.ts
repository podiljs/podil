import { Client } from 'pg'

export class PgMigration {
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
    await this.client.query('CREATE TABLE IF NOT EXISTS podil_migrations (name VARCHAR(255) PRIMARY KEY)')
  }

  async fetchAppliedMigrations (): Promise<string[]> {
    const result = await this.client.query('SELECT name FROM podil_migrations ORDER BY name')
    return result.rows.map((row) => row.name)
  }

  async executeScript (script: string): Promise<void> {
    await this.client.query(script)
  }

  async updateVersion (fileName: string): Promise<void> {
    await this.client.query('INSERT INTO podil_migrations(name) VALUES($1)', [fileName])
  }
}
