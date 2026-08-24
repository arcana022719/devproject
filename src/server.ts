import fastify from "fastify";
import "dotenv/config";
import { Pool } from "pg";

if (process.env.DATABASE_URL === undefined) {
    console.log("WARNING: DATABASE_URL is not defined. Stopping server.");
    process.exit(1);
}
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});



pool.query("SELECT NOW()").then(result => {
    console.log(result.rows);
}).catch(err => {
    console.error(err);
    process.exit(1);
});

const app = fastify();



app.get("/projects", () => {
    return {
        "projects": []
    };
});

app.post("/projects", {
    schema: {
        body: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                },
                description: {
                    type: 'string',
                }
            },
            required: ['name'],
            additionalProperties: false
        }
    }
}, (request, reply) => {
    const { name, description } = request.body as {
        name: string;
        description?: string;
    };
    return reply.status(201).send({
        message: "Project created"
    })
});

app.listen({ port: 3000 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server is running on ${address}`);
}); 