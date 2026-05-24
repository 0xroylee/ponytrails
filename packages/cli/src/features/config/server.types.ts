export interface ServerDatabaseConfig {
	databasePath: string;
	port: number;
}

export interface ServerRuntimeConfig {
	database: ServerDatabaseConfig;
}
