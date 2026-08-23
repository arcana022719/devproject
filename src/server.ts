import fastify from "fastify";

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