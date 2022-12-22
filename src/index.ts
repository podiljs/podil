import { PgMigration } from './migration/PgMigration'
import path from 'path'
import fs from 'fs'

class Podil {
  async migrate (connectionUrl: string, migrationsDir: string = './migrations'): Promise<void> {
    console.log('Applying migrations...')
    const migration = new PgMigration(connectionUrl)
    await migration.connect()
    try {
      await migration.initializeMetaTable()
      const appliedScripts: string[] = await migration.fetchAppliedMigrations()
      const migrationsAbsolutePath = path.resolve(migrationsDir)
      const files = fs.readdirSync(migrationsAbsolutePath)
      const scripts = files.sort((a, b) => a.localeCompare(b))
      if (scripts.length < appliedScripts.length) {
        throw new Error(`Migrations mismatch: the database has ${appliedScripts.length}` +
          ` applied scripts but found ${scripts.length} scripts in the file system`)
      }
      for (let i = 0; i < appliedScripts.length; i++) {
        if (scripts[i] !== appliedScripts[i]) {
          throw new Error(`Migrations mismatch, found ${appliedScripts[i]} in the DB ` +
            `but the next script in the filesystem is ${scripts[i]}`)
        }
      }
      if (scripts.length > appliedScripts.length) {
        const remainingScripts = scripts.slice(appliedScripts.length)
        for (const fileName of remainingScripts) {
          const migrationScript = fs.readFileSync(path.join(migrationsAbsolutePath, fileName)).toString()
          await migration.executeScript(migrationScript)
          await migration.updateVersion(fileName)
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
}

export const podil = new Podil()
