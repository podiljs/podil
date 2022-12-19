class Podil {
  migrate (connectionUrl: string): void {
    console.log('Applying migrations...')
  }
}

const podil = new Podil()

export default podil
