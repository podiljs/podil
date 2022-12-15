class Podil {
  migrate (connectionUrl: string): void {
    console.log('Applying migrations...')
  }
}

const podil = new Podil()
podil.migrate('postgress://podil:podil@localhost:5432/podil')
