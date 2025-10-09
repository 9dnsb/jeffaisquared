---
title: 'Excessive number of rows returned'
metaTitle: 'Optimize Recommendations: Excessive number of rows returned'
metaDescription: 'Learn about the recommendation provided by Optimize for excessive number of rows returned.'
tocDepth: 3
toc: true
---

Optimize provides recommendations to help you identify and resolve performance issues caused by excessive number of rows returned from a query.

The following query targeting a `User` model does not provide a [`take` option](/orm/reference/prisma-client-reference#findmany):

```ts
await prisma.user.findMany({ where: { email: 'janedoe@gmail.com' } })
```

## What is the problem?

When a query is executed without specifying a limit, it will return all relevant rows, which can lead to several issues:

### User experience

- **Viewing data:** Users typically need only a portion of the data at any given time, not all of it at once.
- **Impact on the user's device:** Displaying all the data at once can strain the user's device resources. For example, loading thousands of rows in a web application can slow down or freeze the browser, consuming significant memory and CPU resources.
- **Waiting time:** Retrieving a large number of rows can significantly increase the time it takes to get the data from the database to the user's device.

### Resource Utilization

- **Unnecessary data load:** Processing more data than required wastes valuable resources.
- **Memory usage:** Excessive memory consumption can lead to inefficiency and, in severe cases, cause the system to run out of memory, disrupting the service.

---

title: 'Queries on unindexed columns'
metaTitle: 'Optimize Recommendations: Queries on unindexed columns'
metaDescription: "Learn about the recommendation provided by Optimize for queries on unindexed columns."
tocDepth: 3
toc: true

---

Optimize provides recommendations to help you identify and resolve performance issues caused by missing database indexes.

The following queries targeting the `User` model use a [`where` property](/orm/prisma-client/queries/filtering-and-sorting) to filter on columns that do not have indexes:

```ts
await prisma.user.findFirst({
  where: {
    name: 'Marc',
  },
})

await prisma.user.findFirst({
  where: {
    name: 'Jon',
  },
})

await prisma.user.count({
  where: {
    name: 'Nikolas',
  },
})
```

## What is the problem?

An index allows the database to retrieve data more quickly, similar to how an index in a book helps you locate information without reading every page.

When using Prisma with a `where` property, if no indexes are defined for the relevant columns, the database may need to scan every row in the table (a _“full table scan”_) to find matches. This can be undesirable for several reasons:

### User experience

For large datasets, if the database must scan the entire table to find matching rows, users will experience longer waiting times.

### Resource utilization

- **High CPU usage:** Scanning large tables can significantly increase CPU usage, degrading overall system performance.
- **Memory consumption:** More memory is required to process and store data during a full table scan.
- **Disk I/O:** Full table scans increase disk input/output operations, potentially slowing down other database activities.

:::warning

While these issues might not appear in development due to smaller datasets, they can become _significant_ problems in production, where datasets are typically much larger.

:::

## More on database indexes

### How indexes work

Indexes create a data structure that stores the indexed column's values along with pointers to the corresponding rows in the table. When you query the database using an indexed column, the database can use this index to quickly locate the relevant rows instead of scanning the entire table.

### The trade-offs of indexing

- **Space vs. time:** Indexing requires additional storage space to save index data, but it significantly speeds up data retrieval.
- **Update overhead:** Every time data is added to, updated in, or removed from your table, there is an overhead to keep the indexes up to date, which can slow down write operations.

### When to use indexes

- **Large datasets:** Indexes are particularly beneficial for tables with a large number of rows.
- **Frequent queries with filtering or sorting:** Use indexes on columns that are frequently used for [filtering or sorting](/orm/prisma-client/queries/filtering-and-sorting#filtering).
- **Looking up related data:** Use indexes on foreign key columns to speed up the retrieval of related records, such as when using [`include`](/orm/prisma-client/queries/relation-queries#include-a-relation).

### When not to use indexes

- **Small tables:** For tables with very few rows, the overhead of maintaining indexes might not be worth the performance gain.
- **Write-heavy tables:** Indexes can slow down write operations (`create`, `update`, `delete`) because the index needs to be updated as well. Avoid excessive indexing on models with frequent write operations.
- **Infrequently accessed tables:** If a table is rarely accessed, the benefits of indexing may not justify the overhead.
- **Columns with large data:** Indexing columns with large data can lead to higher storage requirements and might not provide significant performance improvements.
- **Rarely filtered columns:** If a table is often accessed but rarely filtered by a specific column, creating an index on that column may not be beneficial.

:::warning

Even if you index a column, the database may not always use it. Many database management systems, such as PostgreSQL and MySQL, have a _query optimizer_ that evaluates multiple execution plans and selects the one it estimates to be most efficient. In some cases, this may involve ignoring an existing index in favor of a different execution plan that it determines will perform better for that specific query.

:::

---

title: 'Full table scans caused by LIKE operations'
metaTitle: 'Optimize Recommendations: Full table scans caused by LIKE operations'
metaDescription: "Learn about the recommendation provided by Optimize for full table scans caused by Like operations."
tocDepth: 3
toc: true

---

Optimize provides recommendations to help you identify and resolve performance issues caused by full table scans from `LIKE` operations.

The following query targeting the `User` model provides `contains` and `endsWith` as options, which translate to `LIKE` and `ILIKE` SQL operators.

```jsx
await prisma.user.findMany({
  where: {
    email: { contains: 'gmail.com' },
    name: { endsWith: 'Burk' },
  },
})
```

## What is the problem?

`LIKE` and `ILIKE` operators in SQL can lead to full table scans, potentially impacting performance, especially with larger datasets:

### UX

- **Slower load times:** Full table scans can significantly increase the time it takes to retrieve data, leading to longer wait times for users.

### Resource utilization

- **Increased resource usage:** Full table scans increase CPU, memory usage, and disk I/O, straining system resources for your database.
- **Increased costs:** In serverless database pricing plans, more intensive resource usage can translate into higher costs.

---

title: 'Repeated query'
metaTitle: 'Optimize Recommendations: Repeated query'
metaDescription: "Learn about the recommendation provided by Optimize for repeated queries."
tocDepth: 3
toc: true

---

Optimize provides recommendations to help you identify and resolve performance issues caused by repeated queries.

The following query targeting the `Post` model is executed repeatedly with identical parameters:

```ts
await prisma.post.findMany({
  where: {
    published: true,
  },
  take: 20,
})
```

### What is the problem?

When the same query is executed multiple times with the same parameters within a short time frame, it can lead to:

- **Time waste:** A new connection may be established between the application and database, the query and its parameters are sent to the database, the database processes the query, and the results are sent back to the application.
- **Increased resource usage:** Query execution increases CPU and memory usage, as well as disk I/O, putting strain on your database's system resources.
- **Higher costs:** In serverless database pricing models, higher resource usage can result in increased costs.

:::info

To learn more about avoiding repeated queries with caching in Prisma Postgres, refer to the [caching documentation](/postgres/database/caching).

:::

---

title: 'Overfetching'
metaTitle: 'Optimize Recommendations: `SELECT/RETURNING *`'
metaDescription: "Learn about the recommendation provided by Optimize for queries that are overfetching data."
tocDepth: 3
toc: true

---

Optimize provides recommendations to help you identify and resolve performance issues caused by over-fetched data.

The following query might be overfetching data in queries on the `User` model:

```ts
await prisma.user.findMany({
  where: {
    email: { contains: 'gmail' },
  },
  include: {
    links: true,
  },
})
```

## What is the problem?

Retrieving data from all columns of a table, especially in large tables or those with complex relationships, can result in:

- **Increased load times**: Fetching more data than necessary prolongs query processing and data transfer times.
- **Greater resource consumption**: Retrieving unnecessary fields places strain on memory and CPU resources, both in the database and on the machines running your application.
- **Higher costs**: Reading and transferring excess data can lead to increased processing costs.
- **Security risks**: You might unintentionally expose sensitive data that should remain within the database.

---

title: 'Using @db.Money'
metaTitle: 'Optimize Recommendations: Avoid usage of `@db.Money`'
metaDescription: "Learn about the recommendation provided by Optimize for using `@db.Money` native type."
tocDepth: 3
toc: true

---

Optimize provides recommendations to help you identify and resolve performance issues caused by the use of `@db.Money` type.

The following model uses the `@db.Money` native type:

```prisma
model Item {
  // ...
  price Decimal @db.Money
  // ...
}
```

## What is the problem?

The `@db.Money` data type in PostgreSQL is not ideal for storing monetary values. Internally, `@db.Money` is implemented as an integer, which offers speed but lacks flexibility. It handles fractional values and rounding in unexpected ways, which can lead to inaccuracies.

Additionally, the `@db.Money` type does not store any information about the associated currency. Instead, it relies on the global `lc_monetary` locale setting, which may not be suitable for all use cases.

For more information, refer to the [PostgreSQL documentation](https://wiki.postgresql.org/wiki/Don't_Do_This#Don.27t_use_money).

---

title: 'Using @db.Char(n)'
metaTitle: 'Optimize Recommendations: Avoid usage of `@db.Char(n)`'
metaDescription: "Learn about the recommendation provided by Optimize for using `@db.Char(n)` native type."

---

Optimize provides recommendations to help you identify and resolve performance issues caused by the use of `@db.Char(n)` type in PostgreSQL.

In the following example, the `@db.Char(n)` native type has been used within the `Item` model on the `name` field:

```prisma
model Item {
  // ...
  name String @db.Char(1)
  // ...
}
```

### Why this is a problem

The `@db.Char(n)` type enforces a fixed length of `n`, which can cause unexpected issues in production if not properly managed by the application. In PostgreSQL, `char(n)` pads shorter values with spaces, leading to problems during comparisons and other operations. Unlike some databases that optimize `char(n)`, PostgreSQL does not offer such optimizations, making careful handling essential.

---

title: 'Using @db.VarChar(n)'
metaTitle: 'Optimize Recommendations: Avoid usage of `@db.VarChar(n)`'
metaDescription: "Learn about the recommendation provided by Optimize for using `@db.VarChar(n)` native type."
tocDepth: 3
toc: true

---

Optimize provides recommendations to help you identify and resolve performance issues caused by the use of `@db.VarChar(n)` type in PostgreSQL.

The `@db.VarChar(n)` native type has been used within the `Item` model on the name field:

```prisma
model Item {
  // ...
  name String @db.VarChar(1)
  // ...
}
```

### Why this is a problem

The `@db.VarChar(n)` type restricts content to a maximum length of `n`, which can cause unexpected issues in production if not properly managed by the application. In PostgreSQL, `varchar(n)` performs the same as `text`, and no additional optimizations are provided for `varchar(n)`, making the choice between them more about convention than performance.

---

title: 'Using timestamp(0) or timestamptz(0)'
metaTitle: 'Optimize Recommendations: Avoid usage of `timestamp(0)` or `timestamptz(0)`'
metaDescription: "Learn about the recommendation provided by Optimize for using `timestamp(0)` or `timestamptz(0)` native type."
tocDepth: 3
toc: true

---

Optimize provides recommendations to help you identify and resolve performance issues caused by the use of `@db.Timestamp(0)` and `@db.Timestamptz(0)` native types in PostgreSQL.

The `@db.Timestamp(0)` and `@db.Timestamptz(0)` native types have been used within the following `User` model:

```prisma
model User {
  // ...
  date DateTime @db.Timestamp(0)
  deletedAt DateTime @db.Timestamptz(0)
  // ...
}
```

### Why this is a problem

When using a `@db.Timestamp(n)` or `@db.Timestamptz(n)` column with a precision of `0`, the database rounds the time to the nearest whole second, which can lead to unexpected results.

For example, if you insert the current time, such as `15:30:45.678`, into a column with this precision, it will round up to `15:30:46`. This behavior can cause the recorded time to appear up to half a second in the future compared to the original time, which may be surprising when precise time accuracy is critical.

---

title: 'Using CURRENT_TIME'
metaTitle: 'Optimize Recommendations: Avoid usage of `CURRENT_TIME`'
metaDescription: 'Learn about the recommendation provided by Optimize for using the `CURRENT_TIME` function'
tocDepth: 2
toc: true

---

The following raw SQL query uses the `CURRENT_TIME` function:

```ts
prisma.$queryRaw`SELECT CURRENT_TIME;`
```

### Why this is a problem

The `CURRENT_TIME` keyword returns only the time (e.g., 14:30:00) without a date, making it unsuitable for tasks like logging or generating timestamps that require precise event tracking. It returns a value of type `timetz`, which was added for SQL standard compatibility but is generally discouraged.

---

title: 'Unnecessary indexes'
metaTitle: 'Optimize Recommendations: Unnecessary indexes'
metaDescription: "Learn about the recommendation provided by Optimize for using Unnecessary indexes"
tocDepth: 3
toc: true

---

Optimize detects unnecessary indexes and recommends removing them to improve database performance.

### Why this is a problem

Indexes enhance database query performance but can harm efficiency when overused. They consume storage and add overhead to `INSERT`, `UPDATE`, and `DELETE` operations. Unnecessary indexes can result in:

- **Increased write costs:** Extra indexes slow down write operations.
- **Higher storage use:** Unused indexes waste storage space.
- **Query optimizer confusion:** Redundant indexes may cause inefficient query plans.

Removing unnecessary indexes improves performance and simplifies maintenance.

---

title: 'Long-running transactions'
metaTitle: 'Optimize Recommendations: Avoid long-running transactions'
metaDescription: "Learn about the recommendation provided by Optimize for long-running transaction."
tocDepth: 3
toc: true

---

Optimize provides actionable recommendations to help you identify and resolve performance issues caused by **long-running transactions**.

**Long-running transactions** can negatively impact scalability and resilience by locking resources and holding database connections for extended periods. Below is a common example of a problematic long-running transaction:

```ts
// Example: A single massive transaction performing multiple steps
await prisma.$transaction(async (prisma) => {
  const order = await prisma.order.create({
    data: {
      /* ... */
    },
  })
  await prisma.user.update({
    where: { id: userId },
    data: { balance: { decrement: order.total } },
  })
  await prisma.shipping.create({ data: { orderId: order.id /* ... */ } })
  // Additional dependent operations
})
```

### What is the problem?

Long-running transactions can cause several critical issues that harm the performance and reliability of your application:

- **Database locks**: Long transactions hold locks on rows, tables, or other resources, preventing access by other queries. This leads to contention and blocking, which can significantly disrupt concurrent operations.

- **Connection tie-ups**: Transactions occupy database connections for their entire duration. With a limited connection pool, this can quickly exhaust available connections, resulting in application-wide slowdowns or failures.

- **Increased contention**: As locks accumulate and connections are tied up, other transactions queue up, creating bottlenecks, higher latency, and reduced throughput.

- **Scalability challenges**: Inefficiencies caused by long transactions are magnified in high-traffic systems, limiting the system’s ability to scale effectively.

- **Fragility**: When a long transaction fails or times out, all intermediate progress is lost. This is especially problematic in workflows with multiple dependent steps, as recovering from partial failures becomes complex and error-prone.

- **Debugging difficulties**: Troubleshooting long-running transactions is challenging due to their multiple steps and potential failures caused by timeouts, deadlocks, or unexpected dependencies.

---

title: 'Indexing on unique columns'
metaTitle: 'Optimize recommendations: Indexing on unique columns'
metaDescription: "Learn about the recommendation provided by Optimize regarding indexing on uniquely constrained columns."
tocDepth: 3
toc: true

---

Optimize identifies redundant indexing on unique columns and provides recommendations for better database performance.

### Why this is an issue

Unique constraints inherently enforce uniqueness by generating an underlying index. Adding an additional index to the same column is unnecessary and can lead to extra overhead.

This redundancy increases write costs and slows down updates, as the database must synchronize multiple indexes.

:::note

This guideline also applies broadly to relational databases like PostgreSQL, MySQL, MariaDB, SQLite, and SQL Server, which automatically create indexes for unique constraints.

:::

---

title: 'Storing large objects or BLOBs in the database'
metaTitle: 'Optimize recommendations: Avoid storing large objects or BLOBs in the database'
metaDescription: "Learn about the recommendations for avoiding the storage of large objects or BLOBs in the database."
tocDepth: 3
toc: true

---

Optimize provides recommendations to help identify and resolve performance issues caused by storing large objects in the database. It also suggests alternative approaches to mitigate these challenges.

The following model uses the `Bytes` type:

```prisma
model User {
  id    Int    @id @default(autoincrement())
  name  String?
  // Storing raw image data directly in the database
  avatarBytes Bytes?
}
```

## What is the problem?

Storing large binary objects (such as images) in the database can lead to several challenges:

- **Excessive storage usage**: Large objects occupy significant space in the database, complicating management.
- **Increased I/O load**: Handling large objects adds strain to the database's input/output operations.
- **Slower query performance**: Most traditional databases are not optimized for efficiently serving large binary content, resulting in performance degradation during queries or updates.

Moreover, storing large objects directly in the database can cause backups to become disproportionately large, increasing the time required for restoration processes. Serving these files through the database also creates a performance bottleneck, particularly under high traffic or frequent access scenarios.
