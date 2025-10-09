pgvector: Embeddings and vector similarity

pgvector is a Postgres extension for vector similarity search. It can also be used for storing embeddings.

The name of pgvector's Postgres extension is vector.

Learn more about Supabase's AI & Vector offering.
Concepts#
Vector similarity#

Vector similarity refers to a measure of the similarity between two related items. For example, if you have a list of products, you can use vector similarity to find similar products. To do this, you need to convert each product into a "vector" of numbers, using a mathematical model. You can use a similar model for text, images, and other types of data. Once all of these vectors are stored in the database, you can use vector similarity to find similar items.
Embeddings#

This is particularly useful if you're building on top of OpenAI's GPT-3. You can create and store embeddings for retrieval augmented generation.
Usage#
Enable the extension#

-- Example: enable the "vector" extension.create extension vectorwith schema extensions;-- Example: disable the "vector" extensiondrop extension if exists vector;

Even though the SQL code is create extension, this is the equivalent of "enabling the extension".
To disable an extension, call drop extension.
Usage#
Create a table to store vectors#

create table posts ( id serial primary key, title text not null, body text not null, embedding vector(384));

Storing a vector / embedding#

In this example we'll generate a vector using Transformer.js, then store it in the database using the Supabase client.

import { pipeline } from '@xenova/transformers'const generateEmbedding = await pipeline('feature-extraction', 'Supabase/gte-small')const title = 'First post!'const body = 'Hello world!'// Generate a vector using Transformers.jsconst output = await generateEmbedding(body, { pooling: 'mean', normalize: true,})// Extract the embedding outputconst embedding = Array.from(output.data)// Store the vector in Postgresconst { data, error } = await supabase.from('posts').insert({ title, body, embedding,})

Specific usage cases#
Queries with filtering#

If you use an IVFFlat or HNSW index and naively filter the results based on the value of another column, you may get fewer rows returned than requested.

For example, the following query may return fewer than 5 rows, even if 5 corresponding rows exist in the database. This is because the embedding index may not return 5 rows matching the filter.

SELECT \* FROM items WHERE category_id = 123 ORDER BY embedding <-> '[3,1,2]' LIMIT 5;

To get the exact number of requested rows, use iterative search to continue scanning the index until enough results are found.
