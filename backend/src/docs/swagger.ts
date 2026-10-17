import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Radiant Hospitals HMS API',
      version: '1.0.0',
      description: 'Production-ready On-Premise Hospital Management System REST API documentation.',
      contact: {
        name: 'Hospital System Administrator',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Local Hospital Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
