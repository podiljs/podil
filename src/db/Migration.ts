import type { Script } from './Script'

export interface Migration {
  connect: () => Promise<void>

  disconnect: () => Promise<void>

  initializeMetaTable: () => Promise<void>

  fetchAppliedMigrations: () => Promise<Script[]>

  executeSql: (sql: string) => Promise<void>

  updateVersion: (fileName: string, checksum: string) => Promise<void>
}
