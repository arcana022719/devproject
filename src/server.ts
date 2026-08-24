import fastify from "fastify";
import "dotenv/config";
import { Pool } from "pg";
import { request } from "node:http";
import argon2 from 'argon2';

if (process.env.DATABASE_URL === undefined) {
    console.log("WARNING: DATABASE_URL is not defined. Stopping server.");
    process.exit(1);
}
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});



pool.query("SELECT current_database()").then(result => {
    console.log(result.rows);
}).catch(err => {
    console.error(err);
    process.exit(1);
});

const app = fastify({
    ajv: {
        customOptions: {
            removeAdditional: false
        }
    }
});

app.get("/projects", () => {
    return {
        "projects": []
    };
});


app.post("/users", {
    schema: {
        body: {
            type: 'object',
            properties: {
                email: {
                    type: 'string',
                    format: 'email'
                },
                password: {
                    type: 'string',
                    minLength: 8
                }
            },
            required: ['email', 'password'],
            additionalProperties: false
        }
    }

}, async (request, reply) => {
    const { email, password } = request.body as {
        email: string;
        password: string;
    };
    const passwordHash = await argon2.hash(password);

    try {
        const result = await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at", [email, passwordHash])
        return reply.status(201).send({
            message: "User created",
            user: result.rows[0]
        });
    } catch (error: any) {
        console.error(error)
        if (error.code === "23505") {
            return reply.status(409).send({
                message: "User already exists"
            });
        }
        return reply.status(500).send({
            message: "User creation failed",
        });
    }
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