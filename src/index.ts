class Podil {
  migrate (connectionUrl: string): void {
    console.log('Applying migrations...')
  }
}

export const podil: Podil = new Podil()
