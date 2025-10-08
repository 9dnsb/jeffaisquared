Create embeddings
post https://api.openai.com/v1/embeddings

Creates an embedding vector representing the input text.
Request body
input

string or array
Required

Input text to embed, encoded as a string or array of tokens. To embed multiple inputs in a single request, pass an array of strings or array of token arrays. The input must not exceed the max input tokens for the model (8192 tokens for all embedding models), cannot be an empty string, and any array must be 2048 dimensions or less. Example Python code for counting tokens. In addition to the per-input token limit, all embedding models enforce a maximum of 300,000 tokens summed across all inputs in a single request.
model

string
Required

ID of the model to use. You can use the List models API to see all of your available models, or see our Model overview for descriptions of them.
dimensions

integer
Optional

The number of dimensions the resulting output embeddings should have. Only supported in text-embedding-3 and later models.
encoding_format

string
Optional
Defaults to float

The format to return the embeddings in. Can be either float or
base64
.
user

string
Optional

A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse. Learn more.
Returns

A list of embedding objects.
Example request

curl https://api.openai.com/v1/embeddings \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json" \
 -d '{
"input": "The food was delicious and the waiter...",
"model": "text-embedding-ada-002",
"encoding_format": "float"
}'

Response

{
"object": "list",
"data": [
{
"object": "embedding",
"embedding": [
0.0023064255,
-0.009327292,
.... (1536 floats total for ada-002)
-0.0028842222,
],
"index": 0
}
],
"model": "text-embedding-ada-002",
"usage": {
"prompt_tokens": 8,
"total_tokens": 8
}
}

The embedding object

Represents an embedding vector returned by embedding endpoint.
embedding

array

The embedding vector, which is a list of floats. The length of vector depends on the model as listed in the embedding guide.
index

integer

The index of the embedding in the list of embeddings.
object

string

The object type, which is always "embedding".
OBJECT The embedding object

{
"object": "embedding",
"embedding": [
0.0023064255,
-0.009327292,
.... (1536 floats total for ada-002)
-0.0028842222,
],
"index": 0
}
