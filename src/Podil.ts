import { PgMigration } from './db/PgMigration'
import path from 'path'
import fs from 'fs'
import type { Script } from './db/Script'
import crypto from 'crypto'
import type { Migration } from './db/Migration'
import type { PodilConfig } from './PodilConfig'

export class Podil {
  async migrate (connectionUrl: string, config?: PodilConfig): Promise<void> {
    const migrationsDir = config?.migrationsDir ?? './migrations'
    const verifyChecksum = config?.verifyChecksum ?? true
    console.log('Applying migrations...')
    const migration: Migration = new PgMigration(connectionUrl)
    await migration.connect()
    try {
      await migration.initializeMetaTable()
      const appliedScripts: Script[] = await migration.fetchAppliedMigrations()
      const migrationsAbsolutePath = path.resolve(migrationsDir)
      const files = fs.readdirSync(migrationsAbsolutePath)
      for (const file of files) {
        if (!file.toLowerCase().endsWith('.sql')) {
          throw new Error(
            `File '${file}' cannot be executed. Make sure the directory with migrations contains only '.sql' files.`
          )
        }
        if (file.length > 255) {
          throw new Error(`Script filename exceeds the allowed 255 symbols limit: ${file}`)
        }
      }
      const fsScripts = files.sort((a, b) => a.localeCompare(b))
      if (fsScripts.length < appliedScripts.length) {
        throw new Error(`Migrations mismatch: the database has ${appliedScripts.length}` +
          ` applied scripts but found ${fsScripts.length} scripts in the file system.`)
      }
      for (let i = 0; i < appliedScripts.length; i++) {
        const fsScriptName = fsScripts[i]
        const appliedScript = appliedScripts[i]
        if (fsScriptName !== appliedScript.name) {
          throw new Error(`Migrations mismatch: found ${appliedScript.name} in the DB ` +
            `but the next script in the filesystem is ${fsScriptName}.`)
        }
        if (verifyChecksum) {
          const migrationScript = fs.readFileSync(path.join(migrationsAbsolutePath, fsScriptName)).toString()
          const checksum = this.calculateCheckSum(migrationScript)
          if (checksum !== appliedScript.checksum) {
            throw new Error(`Checksum mismatch: File ${fsScriptName} is expected to have checksum ` +
              `${appliedScript.checksum} but the calculated checksum is ${checksum}.`)
          }
        }
      }
      if (fsScripts.length > appliedScripts.length) {
        const remainingScripts = fsScripts.slice(appliedScripts.length)
        for (const fileName of remainingScripts) {
          const migrationScript = fs.readFileSync(path.join(migrationsAbsolutePath, fileName)).toString()
          await migration.executeSql(migrationScript)
          const checksum = this.calculateCheckSum(migrationScript)
          await migration.updateVersion(fileName, checksum)
        }
        const scriptsCount = remainingScripts.length === 1 ? 'one' : remainingScripts.length
        const pluralEnding = remainingScripts.length === 1 ? '' : 's'
        console.log(`Migration finished. Applied ${scriptsCount} new migration${pluralEnding}.`)
      } else {
        console.log('Migration finished. No new scripts found.')
      }
    } finally {
      await migration.disconnect()
    }
  }

  private calculateCheckSum (content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex')
  }
}
