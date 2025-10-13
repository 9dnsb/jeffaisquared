export const alertTools = [
  {
    type: 'function' as const,
    name: 'create_milestone_alert',
    description:
      'Create a sales milestone notification when specific conditions are met',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: "Alert name (e.g., 'Daily Sales $5k')",
        },
        description: {
          type: 'string',
          description: 'Human-readable description of what triggers the alert',
        },
        conditionType: {
          type: 'string',
          enum: [
            'daily_sales_threshold',
            'item_sales_threshold',
            'location_sales_threshold',
          ],
          description: 'Type of milestone to monitor',
        },
        conditionData: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [
                'daily_sales_threshold',
                'item_sales_threshold',
                'location_sales_threshold',
              ],
              description: 'Same as conditionType - required for SQL generation',
            },
            operator: {
              type: 'string',
              enum: ['>=', '>', '<=', '<', '='],
            },
            value: {
              type: 'number',
              description: 'Threshold value (dollars or quantity)',
            },
            timeframe: {
              type: 'string',
              enum: ['today', 'yesterday', 'this_week'],
            },
            itemName: {
              type: 'string',
              description: 'Item name (for item_sales_threshold only)',
            },
            locationName: {
              type: 'string',
              description: 'Location name (for location_sales_threshold only)',
            },
            metric: {
              type: 'string',
              enum: ['quantity', 'revenue'],
              description: 'What to measure (for item alerts)',
            },
          },
          required: ['type', 'operator', 'value', 'timeframe'],
        },
        frequency: {
          type: 'string',
          enum: ['once', 'daily', 'weekly'],
          description: 'How often to check after initial trigger',
        },
      },
      required: [
        'name',
        'description',
        'conditionType',
        'conditionData',
        'frequency',
      ],
    },
  },
]
