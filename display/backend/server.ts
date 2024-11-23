import { serve } from "bun";
import { Database } from "bun:sqlite";
import { promises as fs } from "fs";

const DATA_DIRECTORY = "/data"
const headers = {
	"Access-Control-Allow-Origin": "*", // Allow all origins, or specify one like 'http://localhost:4000'
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allowed HTTP methods
	"Access-Control-Allow-Headers": "Content-Type", // Allowed headers
};

async function createDatabaseConnections(directory: string): Promise<{ [key: string]: Database }> {
	try {
		const files = await fs.readdir(directory, { withFileTypes: true });
		const db_files = files.filter((file) => file.isFile() && file.name.endsWith(".db")).map((file) => file.name);
		return db_files.reduce((acc, file_name) => ({ ...acc, [file_name]: new Database(`${directory}/${file_name}`) }), {})
	} catch (err) {
		console.error("Error reading directory:", err);
		return {}
	}
}
// Create all database connections
console.log("Looking for data sources")
const databases = await createDatabaseConnections(DATA_DIRECTORY);
console.log("Files:")
console.log(databases)

// Only start the server if there is any data to serve
if (Object.keys(databases).length > 0) {
	serve({
		port: 8080,
		fetch(req) {
			if (req.url.includes('/ips')) {
				return new Response(JSON.stringify(Object.keys(databases)), { headers })
			}
			if (req.url.includes('/data')) {
				// const max_data_size = 60 * 60 * 24 * 7 // A weeks worth of data
				const max_data_size=60

				const url = new URL(req.url); // Parse the request URL
				const last_timestamps = Object.fromEntries(url.searchParams); // Convert query parameters to an object

				const data: { [key: string]: number[][] } = {}
				Object.entries(databases).filter(([file_name, _]) => Object.keys(last_timestamps).includes(file_name)).forEach(([file_name, db]) => {
					const t = db.query(`SELECT CAST(strftime('%s', timestamp) AS INTEGER) AS timestamp, response_time_ms FROM ping WHERE CAST(strftime('%s', timestamp) AS INTEGER) > ?1 ORDER BY timestamp DESC LIMIT ${max_data_size}`)
						.values(parseInt(last_timestamps[file_name] ?? "0") || Math.floor((Date.now() - 1e7) / 1e3)) as number[][]
					data[file_name] = t;
				});
				return new Response(JSON.stringify(data), { headers })
			}
			return new Response("Not Found", { status: 404, headers });
		},
	});
} else {
	console.log("Failed to find any data - not starting the server")
}