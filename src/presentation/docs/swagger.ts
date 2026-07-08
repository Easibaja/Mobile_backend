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
      Ticket: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          placeId: { type: 'string' },
          placeName: { type: 'string' },
          productId: { type: 'string' },
          productLabel: { type: 'string' },
          amountMinor: { type: 'integer' },
          currency: { type: 'string' },
          status: { type: 'string' },
          qrToken: { type: 'string' },
          purchasedAt: { type: 'string', format: 'date-time' },
          paymentIntentId: { type: 'string' },
        },
      },
      NotificationPreferences: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          infrastructureEnabled: { type: 'boolean' },
          locationEnabled: { type: 'boolean' },
          weatherEnabled: { type: 'boolean' },
          quietHoursStart: { type: 'string', nullable: true, example: '22:00' },
          quietHoursEnd: { type: 'string', nullable: true, example: '07:00' },
          timezone: { type: 'string', example: 'America/Costa_Rica' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      NotificationDelivery: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          deviceId: { type: 'string', nullable: true },
          category: { type: 'string', enum: ['infrastructure', 'location', 'weather'] },
          title: { type: 'string' },
          body: { type: 'string' },
          status: { type: 'string' },
          providerMessageId: { type: 'string', nullable: true },
          failureReason: { type: 'string', nullable: true },
          sentAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      NotificationJob: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          category: { type: 'string', enum: ['infrastructure', 'location', 'weather'] },
          title: { type: 'string' },
          body: { type: 'string' },
          status: { type: 'string' },
          attempts: { type: 'number' },
          maxAttempts: { type: 'number' },
          nextAttemptAt: { type: 'string', format: 'date-time' },
          lastError: { type: 'string', nullable: true },
          processedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DeviceRegistration: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          token: { type: 'string' },
          platform: { type: 'string' },
          isActive: { type: 'boolean' },
          invalidatedAt: { type: 'string', format: 'date-time', nullable: true },
          lastSeenAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
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
    '/tickets': {
      get: {
        tags: ['Tickets'],
        summary: "Get the current user's tickets (newest first)",
        responses: {
          200: {
            description: 'List of tickets',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tickets: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Ticket' },
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
    '/tickets/confirm': {
      post: {
        tags: ['Tickets'],
        summary: 'Confirm a succeeded PaymentIntent and mint the ticket (idempotent)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['paymentIntentId'],
                properties: {
                  paymentIntentId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'The minted (or existing) ticket',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ticket: { $ref: '#/components/schemas/Ticket' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing paymentIntentId or PaymentIntent not succeeded' },
          401: { description: 'Unauthorized' },
          403: { description: 'PaymentIntent belongs to another user' },
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
    '/notifications/devices': {
      post: {
        tags: ['Notifications'],
        summary: 'Register or update an Expo push device token for current user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: { type: 'string', example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' },
                  platform: { type: 'string', example: 'android' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Device token registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    device: { $ref: '#/components/schemas/DeviceRegistration' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid payload' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/notifications/preferences': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notification preferences for current user',
        responses: {
          200: {
            description: 'Notification preferences',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    preferences: { $ref: '#/components/schemas/NotificationPreferences' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
      put: {
        tags: ['Notifications'],
        summary: 'Update notification preferences for current user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: [
                  'infrastructureEnabled',
                  'locationEnabled',
                  'weatherEnabled',
                  'timezone',
                ],
                properties: {
                  infrastructureEnabled: { type: 'boolean' },
                  locationEnabled: { type: 'boolean' },
                  weatherEnabled: { type: 'boolean' },
                  quietHoursStart: { type: 'string', nullable: true, example: '22:00' },
                  quietHoursEnd: { type: 'string', nullable: true, example: '07:00' },
                  timezone: { type: 'string', example: 'America/Costa_Rica' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated notification preferences',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    preferences: { $ref: '#/components/schemas/NotificationPreferences' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid payload' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/notifications/test': {
      post: {
        tags: ['Notifications'],
        summary: 'Queue a test push notification for current user',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  body: { type: 'string' },
                  category: { type: 'string', enum: ['infrastructure', 'location', 'weather'] },
                },
              },
            },
          },
        },
        responses: {
          202: {
            description: 'Test notification queued',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    job: { $ref: '#/components/schemas/NotificationJob' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid payload' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/notifications/deliveries': {
      get: {
        tags: ['Notifications'],
        summary: 'List notification delivery attempts for current user',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: 'Notification deliveries',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    deliveries: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/NotificationDelivery' },
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
  },
};

export function setupSwagger(app: Express) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}