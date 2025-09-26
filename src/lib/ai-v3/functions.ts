/**
 * AI v3 Function Definitions - Modern OpenAI Function Calling Architecture
 * Maps 100+ test cases to 14 specific, optimized functions
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

// ===== TIME-BASED ANALYSIS FUNCTIONS =====

export const getCustomTimeRangeMetrics: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_custom_time_range_metrics',
    description: 'IMPORTANT: Use this function for ANY custom time period user requests including specific months, quarters, years, "last X days/weeks/months", "this month", "this week", etc. This handles dynamic date parsing for natural language time periods.',
    parameters: {
      type: 'object',
      properties: {
        time_description: {
          type: 'string',
          description: 'Natural language description of the time period (e.g., "August 2025", "last 2 weeks", "this month", "Q1 2024", "last 30 days", "2025")'
        },
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['revenue', 'count', 'quantity', 'avg_transaction', 'unique_items']
          },
          description: 'Metrics to calculate for the time period'
        },
        include_top_location: {
          type: 'boolean',
          description: 'REQUIRED: Set to true for questions like "which location had highest revenue in [timeframe]". Use when user asks about top performing locations.'
        },
        include_daily_breakdown: {
          type: 'boolean',
          description: 'Whether to include day-by-day breakdown of metrics within the time period'
        }
      },
      required: ['time_description', 'metrics', 'include_top_location', 'include_daily_breakdown'],
      additionalProperties: false
    },
    strict: true
  }
}

export const getTimeBasedMetrics: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_time_based_metrics',
    description: 'DEPRECATED: Use get_custom_time_range_metrics instead for better date parsing. Only use this for legacy predefined timeframes: today, yesterday, last_week, last_month, last_30_days, last_year.',
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_week', 'last_month', 'last_30_days', 'last_year'],
          description: 'Time period to analyze'
        },
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['revenue', 'count', 'quantity', 'avg_transaction', 'unique_items']
          },
          description: 'Metrics to calculate for the time period'
        },
        include_top_location: {
          type: 'boolean',
          description: 'Whether to include the top performing location for this period'
        }
      },
      required: ['timeframe', 'metrics', 'include_top_location'],
      additionalProperties: false
    },
    strict: true
  }
}

export const comparePeriods: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'compare_periods',
    description: 'Compare performance between different time periods. Calculate growth rates and period-over-period changes.',
    parameters: {
      type: 'object',
      properties: {
        primary_period: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_week', 'last_month', 'last_year'],
          description: 'Primary time period to analyze'
        },
        comparison_period: {
          type: 'string',
          enum: ['previous_day', 'previous_week', 'previous_month', 'previous_year'],
          description: 'Period to compare against'
        },
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['revenue', 'count', 'quantity', 'avg_transaction']
          },
          description: 'Metrics to compare between periods'
        }
      },
      required: ['primary_period', 'comparison_period', 'metrics'],
      additionalProperties: false
    },
    strict: true
  }
}

export const getBestPerformingDays: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_best_performing_days',
    description: 'Find the best performing days, weeks, or months within a time range. Identify peak performance periods.',
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          enum: ['last_week', 'last_month', 'last_year'],
          description: 'Time range to analyze'
        },
        group_by: {
          type: 'string',
          enum: ['day', 'week', 'month'],
          description: 'How to group the analysis'
        },
        metric: {
          type: 'string',
          enum: ['revenue', 'count', 'quantity'],
          description: 'Metric to rank by'
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: 'Number of top periods to return'
        }
      },
      required: ['timeframe', 'group_by', 'metric', 'limit'],
      additionalProperties: false
    },
    strict: true
  }
}

export const getSeasonalTrends: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_seasonal_trends',
    description: 'Analyze seasonal patterns, weekend vs weekday performance, and hourly trends.',
    parameters: {
      type: 'object',
      properties: {
        analysis_type: {
          type: 'string',
          enum: ['weekend_vs_weekday', 'hourly_patterns', 'monthly_trends', 'seasonal'],
          description: 'Type of trend analysis to perform'
        },
        timeframe: {
          type: 'string',
          enum: ['last_month', 'last_3_months', 'last_year'],
          description: 'Time range for trend analysis'
        },
        metric: {
          type: 'string',
          enum: ['revenue', 'count', 'quantity'],
          description: 'Metric to analyze trends for'
        }
      },
      required: ['analysis_type', 'timeframe', 'metric'],
      additionalProperties: false
    },
    strict: true
  }
}

// ===== LOCATION ANALYSIS FUNCTIONS =====

export const getLocationMetrics: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_location_metrics',
    description: 'Get revenue, transaction count, and performance metrics for specific locations or all locations. For custom time periods like "August 2025", use get_custom_time_range_metrics instead.',
    parameters: {
      type: 'object',
      properties: {
        locations: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['HQ', 'Yonge', 'Bloor', 'Kingston', 'The Well', 'Broadway']
          },
          description: 'Specific locations to analyze. If empty, analyzes all locations.'
        },
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['revenue', 'count', 'avg_transaction', 'market_share', 'efficiency']
          },
          description: 'Metrics to calculate for each location'
        },
        timeframe: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_week', 'last_month', 'all_time'],
          description: 'Time period for location analysis'
        }
      },
      required: ['locations', 'metrics', 'timeframe'],
      additionalProperties: false
    },
    strict: true
  }
}

export const compareLocations: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'compare_locations',
    description: 'Compare performance between specific locations. Find top/bottom performers and calculate differences.',
    parameters: {
      type: 'object',
      properties: {
        comparison_type: {
          type: 'string',
          enum: ['top_vs_bottom', 'specific_pair', 'all_ranked', 'market_share'],
          description: 'Type of location comparison to perform'
        },
        location_a: {
          type: ['string', 'null'],
          enum: ['HQ', 'Yonge', 'Bloor', 'Kingston', 'The Well', 'Broadway', null],
          description: 'First location for specific pair comparison (required for specific_pair type)'
        },
        location_b: {
          type: ['string', 'null'],
          enum: ['HQ', 'Yonge', 'Bloor', 'Kingston', 'The Well', 'Broadway', null],
          description: 'Second location for specific pair comparison (required for specific_pair type)'
        },
        metric: {
          type: 'string',
          enum: ['revenue', 'count', 'avg_transaction', 'efficiency'],
          description: 'Metric to compare locations by'
        },
        timeframe: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_week', 'last_month', 'all_time'],
          description: 'Time period for comparison'
        }
      },
      required: ['comparison_type', 'location_a', 'location_b', 'metric', 'timeframe'],
      additionalProperties: false
    },
    strict: true
  }
}

export const getLocationRankings: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_location_rankings',
    description: 'Rank all locations by specific metrics. Find busiest, quietest, most efficient locations.',
    parameters: {
      type: 'object',
      properties: {
        ranking_type: {
          type: 'string',
          enum: ['by_revenue', 'by_transactions', 'by_avg_transaction', 'by_efficiency', 'by_unique_items'],
          description: 'How to rank the locations'
        },
        order: {
          type: 'string',
          enum: ['highest_to_lowest', 'lowest_to_highest'],
          description: 'Ranking order'
        },
        timeframe: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_week', 'last_month', 'all_time'],
          description: 'Time period for ranking'
        },
        include_statistics: {
          type: 'boolean',
          description: 'Whether to include average, standard deviation statistics'
        }
      },
      required: ['ranking_type', 'order', 'timeframe', 'include_statistics'],
      additionalProperties: false
    },
    strict: true
  }
}

export const getLocationBreakdownByMonth: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_location_breakdown_by_month',
    description: 'IMPORTANT: Use this function when user asks for location breakdown or sales by location for any specific month (e.g., "breakdown of sales by location for August 2025", "location performance in July 2025", "which locations performed best in August"). Returns detailed location-by-location revenue, transaction, and performance metrics.',
    parameters: {
      type: 'object',
      properties: {
        month_year: {
          type: 'string',
          description: 'Month and year in natural language format (e.g., "August 2025", "July 2025", "December 2024", "January 2025")'
        },
        include_performance_metrics: {
          type: 'boolean',
          description: 'Whether to include average order value, market share percentages, and performance rankings for each location'
        },
        sort_by: {
          type: 'string',
          enum: ['revenue', 'transactions', 'avg_order_value'],
          description: 'How to sort the location breakdown results (default: revenue)'
        },
        include_totals: {
          type: 'boolean',
          description: 'Whether to include overall totals and summary statistics across all locations'
        }
      },
      required: ['month_year', 'include_performance_metrics', 'sort_by', 'include_totals'],
      additionalProperties: false
    },
    strict: true
  }
}

// ===== PRODUCT ANALYTICS FUNCTIONS =====

export const getTopProducts: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_top_products',
    description: 'Find top selling products by revenue, quantity, or transaction count. Analyze product performance.',
    parameters: {
      type: 'object',
      properties: {
        ranking_metric: {
          type: 'string',
          enum: ['revenue', 'quantity', 'transaction_count', 'avg_price'],
          description: 'How to rank the products'
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Number of top products to return'
        },
        timeframe: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_week', 'last_month', 'all_time'],
          description: 'Time period for analysis'
        },
        location: {
          type: ['string', 'null'],
          enum: ['HQ', 'Yonge', 'Bloor', 'Kingston', 'The Well', 'Broadway', null],
          description: 'Specific location to analyze or null for all locations'
        }
      },
      required: ['ranking_metric', 'limit', 'timeframe', 'location'],
      additionalProperties: false
    },
    strict: true
  }
}

export const getProductLocationAnalysis: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_product_location_analysis',
    description: 'Analyze product performance across different locations. Find which products sell best where.',
    parameters: {
      type: 'object',
      properties: {
        analysis_type: {
          type: 'string',
          enum: ['top_item_per_location', 'item_distribution', 'location_with_most_items', 'cross_location_comparison'],
          description: 'Type of product-location analysis'
        },
        specific_item: {
          type: ['string', 'null'],
          description: 'Analyze specific item across locations (like "Coffee", "Latte") or null for general analysis'
        },
        metric: {
          type: 'string',
          enum: ['revenue', 'quantity', 'avg_price'],
          description: 'Metric to analyze'
        },
        timeframe: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_week', 'last_month', 'all_time'],
          description: 'Time period for analysis'
        }
      },
      required: ['analysis_type', 'specific_item', 'metric', 'timeframe'],
      additionalProperties: false
    },
    strict: true
  }
}

export const getProductCategories: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_product_categories',
    description: 'Analyze product categories, unique items, and product mix. Calculate product diversity metrics.',
    parameters: {
      type: 'object',
      properties: {
        analysis_type: {
          type: 'string',
          enum: ['top_categories', 'unique_item_count', 'product_mix', 'price_analysis'],
          description: 'Type of product category analysis'
        },
        timeframe: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_week', 'last_month', 'all_time'],
          description: 'Time period for analysis'
        },
        location: {
          type: ['string', 'null'],
          enum: ['HQ', 'Yonge', 'Bloor', 'Kingston', 'The Well', 'Broadway', null],
          description: 'Specific location to analyze or null for all locations'
        }
      },
      required: ['analysis_type', 'timeframe', 'location'],
      additionalProperties: false
    },
    strict: true
  }
}

// ===== BUSINESS METRICS FUNCTIONS =====

export const getBusinessOverview: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_business_overview',
    description: 'Get overall business performance metrics. Total revenue, transactions, averages across all time.',
    parameters: {
      type: 'object',
      properties: {
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['total_revenue', 'total_transactions', 'avg_transaction', 'avg_daily_revenue', 'avg_weekly_revenue', 'avg_monthly_revenue']
          },
          description: 'Business metrics to calculate'
        },
        include_growth_rates: {
          type: 'boolean',
          description: 'Whether to include growth rate calculations'
        },
        include_peak_performance: {
          type: 'boolean',
          description: 'Whether to include highest/lowest daily performance'
        }
      },
      required: ['metrics', 'include_growth_rates', 'include_peak_performance'],
      additionalProperties: false
    },
    strict: true
  }
}

export const getAdvancedAnalytics: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_advanced_analytics',
    description: 'Perform complex business analysis: forecasting, correlations, efficiency ratios, comprehensive health checks.',
    parameters: {
      type: 'object',
      properties: {
        analysis_type: {
          type: 'string',
          enum: ['business_health_check', 'location_correlation', 'efficiency_analysis', 'forecasting', 'customer_patterns'],
          description: 'Type of advanced analysis to perform'
        },
        timeframe: {
          type: 'string',
          enum: ['last_month', 'last_3_months', 'last_year'],
          description: 'Time period for analysis'
        },
        focus_areas: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['revenue_trends', 'location_performance', 'product_mix', 'operational_efficiency']
          },
          description: 'Specific areas to focus the analysis on'
        }
      },
      required: ['analysis_type', 'timeframe', 'focus_areas'],
      additionalProperties: false
    },
    strict: true
  }
}

// ===== FUNCTION REGISTRY =====

export const ALL_SALES_FUNCTIONS: ChatCompletionTool[] = [
  // Time-based functions (30 tests)
  getCustomTimeRangeMetrics,  // NEW: Dynamic date parsing function
  getTimeBasedMetrics,
  comparePeriods,
  getBestPerformingDays,
  getSeasonalTrends,

  // Location functions (25 tests)
  getLocationMetrics,
  compareLocations,
  getLocationRankings,
  getLocationBreakdownByMonth,

  // Product functions (20 tests)
  getTopProducts,
  getProductLocationAnalysis,
  getProductCategories,

  // Business functions (25 tests)
  getBusinessOverview,
  getAdvancedAnalytics
]

// Function name to handler mapping
export const FUNCTION_HANDLERS = {
  'get_custom_time_range_metrics': 'handleCustomTimeRangeMetrics',
  'get_time_based_metrics': 'handleTimeBasedMetrics',
  'compare_periods': 'handleComparePeriods',
  'get_best_performing_days': 'handleBestPerformingDays',
  'get_seasonal_trends': 'handleSeasonalTrends',
  'get_location_metrics': 'handleLocationMetrics',
  'compare_locations': 'handleCompareLocations',
  'get_location_rankings': 'handleLocationRankings',
  'get_location_breakdown_by_month': 'handleLocationBreakdownByMonth',
  'get_top_products': 'handleTopProducts',
  'get_product_location_analysis': 'handleProductLocationAnalysis',
  'get_product_categories': 'handleProductCategories',
  'get_business_overview': 'handleBusinessOverview',
  'get_advanced_analytics': 'handleAdvancedAnalytics'
} as const

export type FunctionName = keyof typeof FUNCTION_HANDLERS