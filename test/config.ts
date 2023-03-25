import { GenericContainer, type StartedTestContainer } from 'testcontainers'

export async function initDatabase (): Promise<{
  container: StartedTestContainer
  connectionString: string
}> {
  const container = await new GenericContainer('postgres:14.5-alpine3.16')
    .withEnvironment({ POSTGRES_USER: 'podil' })
    .withEnvironment({ POSTGRES_PASSWORD: 'podil' })
    .withEnvironment({ POSTGRES_DB: 'podil' })
    .withExposedPorts(5432)
    .start()
  const port = container.getMappedPort(5432)
  const connectionString = `postgres://podil:podil@localhost:${port}/podil`
  return { container, connectionString }
}
