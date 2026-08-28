import fastify from "fastify";
import "dotenv/config";
import { Pool } from "pg";
import argon2 from 'argon2';
import jwt from '@fastify/jwt'


declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: { sub: string } // payload type is used for signing and verifying
        user: {
            sub: string,
        } // user type is return type of `request.user` object
    }
}

if (process.env.DATABASE_URL === undefined) {
    console.log("WARNING: DATABASE_URL is not defined. Stopping server.");
    process.exit(1);
}

if (process.env.JWT_SECRET === undefined) {
    console.log("WARNING: JWT_SECRET is not defined. Stopping server.");
    process.exit(1);
}
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});


const app = fastify({
    ajv: {
        customOptions: {
            removeAdditional: false
        }
    }
});

app.register(jwt, {
    secret: process.env.JWT_SECRET,
    sign: {
        expiresIn: '15m'
    }
});

app.get("/projects", {},
    async (request) => {
        await request.jwtVerify();
        const userId = request.user.sub;
        const result = await pool.query("SELECT * FROM projects WHERE user_id = $1", [userId])
        return {
            projects: result.rows
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
}, async (request, reply) => {

    await request.jwtVerify();

    const { name, description } = request.body as {
        name: string;
        description?: string;
    }
    const userId = request.user.sub;
    const result = await pool.query("INSERT INTO projects (name, description, user_id) VALUES ($1, $2, $3) RETURNING id, user_id, name, description, created_at", [name, description, userId])


    return reply.status(201).send({
        result: result.rows[0]
    })
});


app.post("/login", {
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
        email: string
        password: string
    };
    try {
        const result = await pool.query("SELECT id, password_hash FROM users WHERE email =$1", [email])
        if (result.rows.length === 0) {
            return reply.status(401).send({
                message: "Invalid email or password"
            });
        }
        const user = result.rows[0];
        const validPassword = await argon2.verify(user.password_hash, password)
        if (!validPassword) {
            return reply.status(401).send({
                message: "Invalid email or password"
            });
        }

        const token = app.jwt.sign({ sub: user.id });
        return reply.status(200).send({
            message: "Login successful",
            token: token
        });
    }
    catch (error: any) {
        console.error(error);
        return reply.status(500).send({
            message: "login failed",
        });
    }
});

















app.listen({ port: 3000 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server is running on ${address}`);
}); 