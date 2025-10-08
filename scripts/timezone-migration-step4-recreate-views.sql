-- ============================================================================
-- STEP 4: Recreate All Views
-- ============================================================================

-- View: daily_sales_summary
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
  (o.date)::date AS sales_date,
  l.name AS location_name,
  l."squareLocationId" AS location_id,
  count(o.id) AS transaction_count,
  count(DISTINCT li."itemId") AS unique_items_sold,
  sum(o."totalAmount") AS total_revenue_cents,
  round(((sum(o."totalAmount"))::numeric / (100)::numeric), 2) AS total_revenue_dollars,
  sum(li.quantity) AS total_quantity_sold,
  round((avg(o."totalAmount") / (100)::numeric), 2) AS avg_transaction_value,
  round((((sum(o."totalAmount"))::numeric / (count(o.id))::numeric) / (100)::numeric), 2) AS avg_order_value
FROM ((orders o
  JOIN locations l ON ((o."locationId" = l."squareLocationId")))
  LEFT JOIN line_items li ON ((o.id = li."orderId")))
WHERE (o.state = 'COMPLETED'::text)
GROUP BY ((o.date)::date), l.name, l."squareLocationId"
ORDER BY ((o.date)::date) DESC, (sum(o."totalAmount")) DESC;

-- View: location_performance
CREATE OR REPLACE VIEW location_performance AS
SELECT
  l.name AS location_name,
  l."squareLocationId" AS location_id,
  l.address,
  l.status,
  count(o.id) AS total_orders,
  count(DISTINCT (o.date)::date) AS active_days,
  sum(o."totalAmount") AS total_revenue_cents,
  round(((sum(o."totalAmount"))::numeric / (100)::numeric), 2) AS total_revenue_dollars,
  sum(li.quantity) AS total_items_sold,
  count(DISTINCT li."itemId") AS unique_items,
  round((avg(o."totalAmount") / (100)::numeric), 2) AS avg_transaction_value,
  round((((sum(o."totalAmount"))::numeric / (NULLIF(count(DISTINCT (o.date)::date), 0))::numeric) / (100)::numeric), 2) AS avg_daily_revenue,
  round((((sum(o."totalAmount"))::numeric / (NULLIF(count(o.id), 0))::numeric) / (100)::numeric), 2) AS avg_order_value,
  max(o.date) AS last_sale_date,
  min(o.date) AS first_sale_date
FROM ((locations l
  LEFT JOIN orders o ON (((l."squareLocationId" = o."locationId") AND (o.state = 'COMPLETED'::text))))
  LEFT JOIN line_items li ON ((o.id = li."orderId")))
GROUP BY l.name, l."squareLocationId", l.address, l.status
ORDER BY (sum(o."totalAmount")) DESC NULLS LAST;

-- View: product_performance
CREATE OR REPLACE VIEW product_performance AS
SELECT
  COALESCE(i.name, li.name) AS product_name,
  COALESCE(i.category, li.category) AS category,
  i.id AS item_id,
  i."squareItemId",
  i."isActive",
  count(li.id) AS total_line_items,
  count(DISTINCT li."orderId") AS total_orders,
  sum(li.quantity) AS total_quantity_sold,
  sum(li."totalPriceAmount") AS total_revenue_cents,
  round(((sum(li."totalPriceAmount"))::numeric / (100)::numeric), 2) AS total_revenue_dollars,
  round((avg(li."unitPriceAmount") / (100)::numeric), 2) AS avg_unit_price,
  round((avg(li."totalPriceAmount") / (100)::numeric), 2) AS avg_line_total,
  round((((sum(li."totalPriceAmount"))::numeric / (NULLIF(sum(li.quantity), 0))::numeric) / (100)::numeric), 2) AS revenue_per_item,
  count(DISTINCT l.name) AS sold_at_locations,
  max(o.date) AS last_sold_date,
  min(o.date) AS first_sold_date
FROM (((line_items li
  JOIN orders o ON ((li."orderId" = o.id)))
  JOIN locations l ON ((o."locationId" = l."squareLocationId")))
  LEFT JOIN items i ON ((li."itemId" = i.id)))
WHERE (o.state = 'COMPLETED'::text)
GROUP BY COALESCE(i.name, li.name), COALESCE(i.category, li.category), i.id, i."squareItemId", i."isActive"
ORDER BY (sum(li."totalPriceAmount")) DESC;

-- View: business_overview
CREATE OR REPLACE VIEW business_overview AS
SELECT
  count(DISTINCT l."squareLocationId") AS total_locations,
  count(DISTINCT o.id) AS total_orders,
  count(DISTINCT li.id) AS total_line_items,
  count(DISTINCT COALESCE(i.id, li.name)) AS unique_products,
  count(DISTINCT COALESCE(i.category, li.category)) AS unique_categories,
  sum(o."totalAmount") AS total_revenue_cents,
  round(((sum(o."totalAmount"))::numeric / (100)::numeric), 2) AS total_revenue_dollars,
  sum(li.quantity) AS total_items_sold,
  round((avg(o."totalAmount") / (100)::numeric), 2) AS avg_transaction_value,
  round((((sum(o."totalAmount"))::numeric / (NULLIF(count(DISTINCT (o.date)::date), 0))::numeric) / (100)::numeric), 2) AS avg_daily_revenue,
  round((((sum(o."totalAmount"))::numeric / (NULLIF(count(DISTINCT l."squareLocationId"), 0))::numeric) / (100)::numeric), 2) AS avg_revenue_per_location,
  count(DISTINCT (o.date)::date) AS total_active_days,
  max(o.date) AS latest_sale_date,
  min(o.date) AS earliest_sale_date,
  round(((count(o.id))::numeric / (NULLIF(count(DISTINCT (o.date)::date), 0))::numeric), 2) AS avg_orders_per_day,
  round(((sum(li.quantity))::numeric / (NULLIF(count(o.id), 0))::numeric), 2) AS avg_items_per_order
FROM (((orders o
  JOIN locations l ON ((o."locationId" = l."squareLocationId")))
  LEFT JOIN line_items li ON ((o.id = li."orderId")))
  LEFT JOIN items i ON ((li."itemId" = i.id)))
WHERE (o.state = 'COMPLETED'::text);

SELECT 'All views recreated successfully! Migration complete.' as status;
