import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'Mobile App API',
    version: '1.0.0',
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Favorite: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          placeId: { type: 'string' },
          name: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          lat: { type: 'number', nullable: true },
          lng: { type: 'number', nullable: true },
          types: { type: 'array', items: { type: 'string' } },
          rating: { type: 'number', nullable: true },
          photoName: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', nullable: true },
          name: { type: 'string', nullable: true },
          provider: { type: 'string' },
          picture: { type: 'string', nullable: true },
        },
      },
      TicketProduct: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          amountMinor: { type: 'integer' },
          currency: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/catalog': {
      get: {
        tags: ['Catalog'],
        summary: 'Get purchasable products for the given Google place types',
        parameters: [
          {
            name: 'types',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Comma-separated Google place types, e.g. national_park,park',
          },
        ],
        responses: {
          200: {
            description: 'Products for the given types (currency USD)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    products: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TicketProduct' },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/payments/intent': {
      post: {
        tags: ['Payments'],
        summary: 'Create a Stripe PaymentIntent for a catalog product',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['placeId', 'placeName', 'productId'],
                properties: {
                  placeId: { type: 'string' },
                  placeName: { type: 'string' },
                  productId: { type: 'string', example: 'national_park.day' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'PaymentIntent client secret and product summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    clientSecret: { type: 'string' },
                    amountMinor: { type: 'integer' },
                    currency: { type: 'string' },
                    productLabel: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing placeId, placeName or productId' },
          401: { description: 'Unauthorized' },
          404: { description: 'Unknown productId' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: {
          200: { description: 'Server is up' },
        },
      },
    },
    '/auth': {
      post: {
        tags: ['Auth'],
        summary: 'Login or signup with Google or Apple',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['provider', 'idToken'],
                properties: {
                  provider: { type: 'string', enum: ['google', 'apple'] },
                  idToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Session token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sessionToken: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        responses: {
          200: {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/auth/token': {
      post: {
        tags: ['Auth'],
        summary: 'Get a session token by email (development only)',
        description: '⚠️ Only works when NODE_ENV=development. Use this to get a token for testing in Swagger without needing the mobile app.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', example: 'your@email.com' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Session token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sessionToken: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing email' },
          404: { description: 'User not found or endpoint disabled in production' },
        },
      },
    },
    '/favorites': {
      get: {
        tags: ['Favorites'],
        summary: 'Get all favorites for current user',
        responses: {
          200: {
            description: 'List of favorites',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    favorites: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Favorite' },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Favorites'],
        summary: 'Add a favorite',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['placeId'],
                properties: {
                  placeId: { type: 'string' },
                  name: { type: 'string' },
                  address: { type: 'string' },
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                  types: { type: 'array', items: { type: 'string' } },
                  rating: { type: 'number' },
                  photoName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created favorite',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    favorite: { $ref: '#/components/schemas/Favorite' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing placeId' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/favorites/{placeId}': {
      delete: {
        tags: ['Favorites'],
        summary: 'Remove a favorite',
        parameters: [
          {
            name: 'placeId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          204: { description: 'Deleted' },
          401: { description: 'Unauthorized' },
        },
      },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}