import { PgMigration } from './db/PgMigration'
import path from 'path'
import fs from 'fs'
import { Script } from './db/Script'
import crypto from 'crypto'
import { Migration } from './db/Migration'
import { PodilConfig } from './PodilConfig'

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
          await migration.executeSql(migrationScript)
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
