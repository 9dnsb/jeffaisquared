# Model optimization

Ensure quality model outputs with evals and fine-tuning in the OpenAI platform.

LLM output is non-deterministic, and model behavior changes between model snapshots and families. Developers must constantly measure and tune the performance of LLM applications to ensure they're getting the best results. In this guide, we explore the techniques and OpenAI platform tools you can use to ensure high quality outputs from the model.

[

![Evals](https://cdn.openai.com/API/docs/images/blue_card.png)

Evals

Systematically measure performance.

](/docs/guides/evals)[

![Prompt engineering](https://cdn.openai.com/API/docs/images/orange_card.png)

Prompt engineering

Give context, instructions, and goals.

](/docs/guides/text?api-mode=responses#prompt-engineering)[

![Fine-tuning](https://cdn.openai.com/API/docs/images/purple_card.png)

Fine-tuning

Train models to excel at a task.

](/docs/guides/supervised-fine-tuning)

## Model optimization workflow

Optimizing model output requires a combination of **evals**, **prompt engineering**, and **fine-tuning**, creating a flywheel of feedback that leads to better prompts and better training data for fine-tuning. The optimization process usually goes something like this.

1.  Write [evals](/docs/guides/evals) that measure model output, establishing a baseline for performance and accuracy.
2.  [Prompt the model](/docs/guides/text) for output, providing relevant context data and instructions.
3.  For some use cases, it may be desirable to [fine-tune](/docs/guides/model-optimization#fine-tune-a-model) a model for a specific task.
4.  Run evals using test data that is representative of real world inputs. Measure the performance of your prompt and fine-tuned model.
5.  Tweak your prompt or fine-tuning dataset based on eval feedback.
6.  Repeat the loop continuously to improve your model results.

Here's an overview of the major steps, and how to do them using the OpenAI platform.

## Build evals

In the OpenAI platform, you can [build and run evals](/docs/guides/evals) either via API or in the [dashboard](/evaluations). You might even consider writing evals _before_ you start writing prompts, taking an approach akin to behavior-driven development (BDD).

Run your evals against test inputs like you expect to see in production. Using one of several available [graders](/docs/guides/graders), measure the results of a prompt against your test data set.

[

Learn about evals

Run tests on your model outputs to ensure you're getting the right results.

](/docs/guides/evals)

## Write effective prompts

With evals in place, you can effectively iterate on [prompts](/docs/guides/text). The prompt engineering process may be all you need in order to get great results for your use case. Different models may require different prompting techniques, but there are several best practices you can apply across the board to get better results.

- **Include relevant context** - in your instructions, include text or image content that the model will need to generate a response from outside its training data. This could include data from private databases or current, up-to-the-minute information.
- **Provide clear instructions** - your prompt should contain clear goals about what kind of output you want. GPT models like `gpt-4.1` are great at following very explicit instructions, while [reasoning models](/docs/guides/reasoning) like `o4-mini` tend to do better with high level guidance on outcomes.
- **Provide example outputs** - give the model a few examples of correct output for a given prompt (a process called few-shot learning). The model can extrapolate from these examples how it should respond for other prompts.

[

Learn about prompt engineering

Learn the basics of writing good prompts for the model.

](/docs/guides/text)

## Fine-tune a model

OpenAI models are already pre-trained to perform across a broad range of subjects and tasks. Fine-tuning lets you take an OpenAI base model, provide the kinds of inputs and outputs you expect in your application, and get a model that excels in the tasks you'll use it for.

Fine-tuning can be a time-consuming process, but it can also enable a model to consistently format responses in a certain way or handle novel inputs. You can use fine-tuning with [prompt engineering](/docs/guides/text) to realize a few more benefits over prompting alone:

- You can provide more example inputs and outputs than could fit within the context window of a single request, enabling the model handle a wider variety of prompts.
- You can use shorter prompts with fewer examples and context data, which saves on token costs at scale and can be lower latency.
- You can train on proprietary or sensitive data without having to include it via examples in every request.
- You can train a smaller, cheaper, faster model to excel at a particular task where a larger model is not cost-effective.

Visit our [pricing page](https://openai.com/api/pricing) to learn more about how fine-tuned model training and usage are billed.

### Fine-tuning methods

These are the fine-tuning methods supported in the OpenAI platform today.

||
|Supervised fine-tuning (SFT)|Provide examples of correct responses to prompts to guide the model's behavior.Often uses human-generated "ground truth" responses to show the model how it should respond.|ClassificationNuanced translationGenerating content in a specific formatCorrecting instruction-following failures|gpt-4.1-2025-04-14 gpt-4.1-mini-2025-04-14 gpt-4.1-nano-2025-04-14|
|Vision fine-tuning|Provide image inputs for supervised fine-tuning to improve the model's understanding of image inputs.|Image classificationCorrecting failures in instruction following for complex prompts|gpt-4o-2024-08-06|
|Direct preference optimization (DPO)|Provide both a correct and incorrect example response for a prompt. Indicate the correct response to help the model perform better.|Summarizing text, focusing on the right thingsGenerating chat messages with the right tone and style|gpt-4.1-2025-04-14 gpt-4.1-mini-2025-04-14 gpt-4.1-nano-2025-04-14|
|Reinforcement fine-tuning (RFT)|Generate a response for a prompt, provide an expert grade for the result, and reinforce the model's chain-of-thought for higher-scored responses.Requires expert graders to agree on the ideal output from the model.Reasoning models only.|Complex domain-specific tasks that require advanced reasoningMedical diagnoses based on history and diagnostic guidelinesDetermining relevant passages from legal case law|o4-mini-2025-04-16|

### How fine-tuning works

In the OpenAI platform, you can create fine-tuned models either in the [dashboard](/finetune) or [with the API](/docs/api-reference/fine-tuning). This is the general shape of the fine-tuning process:

1.  Collect a dataset of examples to use as training data
2.  Upload that dataset to OpenAI, formatted in JSONL
3.  Create a fine-tuning job using one of the methods above, depending on your goals—this begins the fine-tuning training process
4.  In the case of RFT, you'll also define a grader to score the model's behavior
5.  Evaluate the results

Get started with [supervised fine-tuning](/docs/guides/supervised-fine-tuning), [vision fine-tuning](/docs/guides/vision-fine-tuning), [direct preference optimization](/docs/guides/direct-preference-optimization), or [reinforcement fine-tuning](/docs/guides/reinforcement-fine-tuning).

## Learn from experts

Model optimization is a complex topic, and sometimes more art than science. Check out the videos below from members of the OpenAI team on model optimization techniques.

Cost/accuracy/latency

Distillation

Optimizing LLM Performance

# Evaluating model performance

Test and improve model outputs through evaluations.

Evaluations (often called **evals**) test model outputs to ensure they meet style and content criteria that you specify. Writing evals to understand how your LLM applications are performing against your expectations, especially when upgrading or trying new models, is an essential component to building reliable applications.

In this guide, we will focus on **configuring evals programmatically using the [Evals API](/docs/api-reference/evals)**. If you prefer, you can also configure evals [in the OpenAI dashboard](/evaluations).

Broadly, there are three steps to build and run evals for your LLM application.

1.  Describe the task to be done as an eval
2.  Run your eval with test inputs (a prompt and input data)
3.  Analyze the results, then iterate and improve on your prompt

This process is somewhat similar to behavior-driven development (BDD), where you begin by specifying how the system should behave before implementing and testing the system. Let's see how we would complete each of the steps above using the [Evals API](/docs/api-reference/evals).

## Create an eval for a task

Creating an eval begins by describing a task to be done by a model. Let's say that we would like to use a model to classify the contents of IT support tickets into one of three categories: `Hardware`, `Software`, or `Other`.

To implement this use case, you can use either the [Chat Completions API](/docs/api-reference/chat) or the [Responses API](/docs/api-reference/responses). Both examples below combine a [developer message](/docs/guides/text) with a user message containing the text of a support ticket.

Categorize IT support tickets

```bash
curl https://api.openai.com/v1/responses \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "gpt-4.1",
        "input": [
            {
                "role": "developer",
                "content": "Categorize the following support ticket into one of Hardware, Software, or Other."
            },
            {
                "role": "user",
                "content": "My monitor wont turn on - help!"
            }
        ]
    }'
```

```javascript
import OpenAI from 'openai'
const client = new OpenAI()

const instructions = `
You are an expert in categorizing IT support tickets. Given the support
ticket below, categorize the request into one of "Hardware", "Software",
or "Other". Respond with only one of those words.
`

const ticket = "My monitor won't turn on - help!"

const response = await client.responses.create({
  model: 'gpt-4.1',
  input: [
    { role: 'developer', content: instructions },
    { role: 'user', content: ticket },
  ],
})

console.log(response.output_text)
```

```python
from openai import OpenAI
client = OpenAI()

instructions = """
You are an expert in categorizing IT support tickets. Given the support
ticket below, categorize the request into one of "Hardware", "Software",
or "Other". Respond with only one of those words.
"""

ticket = "My monitor won't turn on - help!"

response = client.responses.create(
    model="gpt-4.1",
    input=[
        {"role": "developer", "content": instructions},
        {"role": "user", "content": ticket},
    ],
)

print(response.output_text)
```

Let's set up an eval to test this behavior [via API](/docs/api-reference/evals). An eval needs two key ingredients:

- `data_source_config`: A schema for the test data you will use along with the eval.
- `testing_criteria`: The [graders](/docs/guides/graders) that determine if the model output is correct.

Create an eval

```bash
curl https://api.openai.com/v1/evals \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "IT Ticket Categorization",
        "data_source_config": {
            "type": "custom",
            "item_schema": {
                "type": "object",
                "properties": {
                    "ticket_text": { "type": "string" },
                    "correct_label": { "type": "string" }
                },
                "required": ["ticket_text", "correct_label"]
            },
            "include_sample_schema": true
        },
        "testing_criteria": [
            {
                "type": "string_check",
                "name": "Match output to human label",
                "input": "{{ sample.output_text }}",
                "operation": "eq",
                "reference": "{{ item.correct_label }}"
            }
        ]
    }'
```

```javascript
import OpenAI from 'openai'
const openai = new OpenAI()

const evalObj = await openai.evals.create({
  name: 'IT Ticket Categorization',
  data_source_config: {
    type: 'custom',
    item_schema: {
      type: 'object',
      properties: {
        ticket_text: { type: 'string' },
        correct_label: { type: 'string' },
      },
      required: ['ticket_text', 'correct_label'],
    },
    include_sample_schema: true,
  },
  testing_criteria: [
    {
      type: 'string_check',
      name: 'Match output to human label',
      input: '{{ sample.output_text }}',
      operation: 'eq',
      reference: '{{ item.correct_label }}',
    },
  ],
})

console.log(evalObj)
```

```python
from openai import OpenAI
client = OpenAI()

eval_obj = client.evals.create(
    name="IT Ticket Categorization",
    data_source_config={
        "type": "custom",
        "item_schema": {
            "type": "object",
            "properties": {
                "ticket_text": {"type": "string"},
                "correct_label": {"type": "string"},
            },
            "required": ["ticket_text", "correct_label"],
        },
        "include_sample_schema": True,
    },
    testing_criteria=[
        {
            "type": "string_check",
            "name": "Match output to human label",
            "input": "{{ sample.output_text }}",
            "operation": "eq",
            "reference": "{{ item.correct_label }}",
        }
    ],
)

print(eval_obj)
```

Explanation: data_source_config parameter

Running this eval will require a test data set that represents the type of data you expect your prompt to work with (more on creating the test data set later in this guide). In our `data_source_config` parameter, we specify that each **item** in the data set will conform to a [JSON schema](https://json-schema.org/) with two properties:

- `ticket_text`: a string of text with the contents of a support ticket
- `correct_label`: a "ground truth" output that the model should match, provided by a human

Since we will be referencing a **sample** in our test criteria (the output generated by a model given our prompt), we also set `include_sample_schema` to `true`.

```json
{
  "type": "custom",
  "item_schema": {
    "type": "object",
    "properties": {
      "ticket": { "type": "string" },
      "category": { "type": "string" }
    },
    "required": ["ticket", "category"]
  },
  "include_sample_schema": true
}
```

Explanation: testing_criteria parameter

In our `testing_criteria`, we define how we will conclude if the model output satisfies our requirements for each item in the data set. In this case, we just want the model to output one of three category strings based on the input ticket. The string it outputs should exactly match the human-labeled `correct_label` field in our test data. So in this case, we will want to use a `string_check` grader to evaluate the output.

In the test configuration, we will introduce template syntax, represented by the `{{` and `}}` brackets below. This is how we will insert dynamic content into the test for this eval.

- `{{ item.correct_label }}` refers to the ground truth value in our test data.
- `{{ sample.output_text }}` refers to the content we will generate from a model to evaluate our prompt - we'll show how to do that when we actually kick off the eval run.

```json
{
  "type": "string_check",
  "name": "Category string match",
  "input": "{{ sample.output_text }}",
  "operation": "eq",
  "reference": "{{ item.category }}"
}
```

After creating the eval, it will be assigned a UUID that you will need to address it later when kicking off a run.

```json
{
  "object": "eval",
  "id": "eval_67e321d23b54819096e6bfe140161184",
  "data_source_config": {
    "type": "custom",
    "schema": { ... omitted for brevity... }
  },
  "testing_criteria": [
    {
      "name": "Match output to human label",
      "id": "Match output to human label-c4fdf789-2fa5-407f-8a41-a6f4f9afd482",
      "type": "string_check",
      "input": "{{ sample.output_text }}",
      "reference": "{{ item.correct_label }}",
      "operation": "eq"
    }
  ],
  "name": "IT Ticket Categorization",
  "created_at": 1742938578,
  "metadata": {}
}
```

Now that we've created an eval that describes the desired behavior of our application, let's test a prompt with a set of test data.

## Test a prompt with your eval

Now that we have defined how we want our app to behave in an eval, let's construct a prompt that reliably generates the correct output for a representative sample of test data.

### Uploading test data

There are several ways to provide test data for eval runs, but it may be convenient to upload a [JSONL](https://jsonlines.org/) file that contains data in the schema we specified when we created our eval. A sample JSONL file that conforms to the schema we set up is below:

```json
{ "item": { "ticket_text": "My monitor won't turn on!", "correct_label": "Hardware" } }
{ "item": { "ticket_text": "I'm in vim and I can't quit!", "correct_label": "Software" } }
{ "item": { "ticket_text": "Best restaurants in Cleveland?", "correct_label": "Other" } }
```

This data set contains both test inputs and ground truth labels to compare model outputs against.

Next, let's upload our test data file to the OpenAI platform so we can reference it later. You can upload files [in the dashboard here](/storage/files), but it's possible to [upload files via API](/docs/api-reference/files/create) as well. The samples below assume you are running the command in a directory where you saved the sample JSON data above to a file called `tickets.jsonl`:

Upload a test data file

```bash
curl https://api.openai.com/v1/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F purpose="evals" \
  -F file="@tickets.jsonl"
```

```javascript
import fs from 'fs'
import OpenAI from 'openai'

const openai = new OpenAI()

const file = await openai.files.create({
  file: fs.createReadStream('tickets.jsonl'),
  purpose: 'evals',
})

console.log(file)
```

```python
from openai import OpenAI
client = OpenAI()

file = client.files.create(
    file=open("tickets.jsonl", "rb"),
    purpose="evals"
)

print(file)
```

When you upload the file, make note of the unique `id` property in the response payload (also available in the UI if you uploaded via the browser) - we will need to reference that value later:

```json
{
  "object": "file",
  "id": "file-CwHg45Fo7YXwkWRPUkLNHW",
  "purpose": "evals",
  "filename": "tickets.jsonl",
  "bytes": 208,
  "created_at": 1742834798,
  "expires_at": null,
  "status": "processed",
  "status_details": null
}
```

### Creating an eval run

With our test data in place, let's evaluate a prompt and see how it performs against our test criteria. Via API, we can do this by [creating an eval run](/docs/api-reference/evals/createRun).

Make sure to replace `YOUR_EVAL_ID` and `YOUR_FILE_ID` with the unique IDs of the eval configuration and test data files you created in the steps above.

Create an eval run

```bash
curl https://api.openai.com/v1/evals/YOUR_EVAL_ID/runs \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Categorization text run",
        "data_source": {
            "type": "responses",
            "model": "gpt-4.1",
            "input_messages": {
                "type": "template",
                "template": [
                    {"role": "developer", "content": "You are an expert in categorizing IT support tickets. Given the support ticket below, categorize the request into one of Hardware, Software, or Other. Respond with only one of those words."},
                    {"role": "user", "content": "{{ item.ticket_text }}"}
                ]
            },
            "source": { "type": "file_id", "id": "YOUR_FILE_ID" }
        }
    }'
```

```javascript
import OpenAI from 'openai'
const openai = new OpenAI()

const run = await openai.evals.runs.create('YOUR_EVAL_ID', {
  name: 'Categorization text run',
  data_source: {
    type: 'responses',
    model: 'gpt-4.1',
    input_messages: {
      type: 'template',
      template: [
        {
          role: 'developer',
          content:
            "You are an expert in categorizing IT support tickets. Given the support ticket below, categorize the request into one of 'Hardware', 'Software', or 'Other'. Respond with only one of those words.",
        },
        { role: 'user', content: '{{ item.ticket_text }}' },
      ],
    },
    source: { type: 'file_id', id: 'YOUR_FILE_ID' },
  },
})

console.log(run)
```

```python
from openai import OpenAI
client = OpenAI()

run = client.evals.runs.create(
    "YOUR_EVAL_ID",
    name="Categorization text run",
    data_source={
        "type": "responses",
        "model": "gpt-4.1",
        "input_messages": {
            "type": "template",
            "template": [
                {"role": "developer", "content": "You are an expert in categorizing IT support tickets. Given the support ticket below, categorize the request into one of 'Hardware', 'Software', or 'Other'. Respond with only one of those words."},
                {"role": "user", "content": "{{ item.ticket_text }}"},
            ],
        },
        "source": {"type": "file_id", "id": "YOUR_FILE_ID"},
    },
)

print(run)
```

When we create the run, we set up a prompt using either a [Chat Completions](/docs/guides/text?api-mode=chat) messages array or a [Responses](/docs/api-reference/responses) input. This prompt is used to generate a model response for every line of test data in your data set. We can use the double curly brace syntax to template in the dynamic variable `item.ticket_text`, which is drawn from the current test data item.

If the eval run is successfully created, you'll receive an API response that looks like this:

```json
{
    "object": "eval.run",
    "id": "evalrun_67e44c73eb6481909f79a457749222c7",
    "eval_id": "eval_67e44c5becec81909704be0318146157",
    "report_url": "https://platform.openai.com/evaluations/abc123",
    "status": "queued",
    "model": "gpt-4.1",
    "name": "Categorization text run",
    "created_at": 1743015028,
    "result_counts": { ... },
    "per_model_usage": null,
    "per_testing_criteria_results": null,
    "data_source": {
        "type": "responses",
        "source": {
            "type": "file_id",
            "id": "file-J7MoX9ToHXp2TutMEeYnwj"
        },
        "input_messages": {
            "type": "template",
            "template": [
                {
                    "type": "message",
                    "role": "developer",
                    "content": {
                        "type": "input_text",
                        "text": "You are an expert in...."
                    }
                },
                {
                    "type": "message",
                    "role": "user",
                    "content": {
                        "type": "input_text",
                        "text": "{{item.ticket_text}}"
                    }
                }
            ]
        },
        "model": "gpt-4.1",
        "sampling_params": null
    },
    "error": null,
    "metadata": {}
}
```

Your eval run has now been queued, and it will execute asynchronously as it processes every row in your data set, generating responses for testing with the prompt and model we specified.

## Analyze the results

To receive updates when a run succeeds, fails, or is canceled, create a webhook endpoint and subscribe to the `eval.run.succeeded`, `eval.run.failed`, and `eval.run.canceled` events. See the [webhooks guide](/docs/guides/webhooks) for more details.

Depending on the size of your dataset, the eval run may take some time to complete. You can view current status in the dashboard, but you can also [fetch the current status of an eval run via API](/docs/api-reference/evals/getRun):

Retrieve eval run status

```bash
curl https://api.openai.com/v1/evals/YOUR_EVAL_ID/runs/YOUR_RUN_ID \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json"
```

```javascript
import OpenAI from 'openai'
const openai = new OpenAI()

const run = await openai.evals.runs.retrieve('YOUR_RUN_ID', {
  eval_id: 'YOUR_EVAL_ID',
})
console.log(run)
```

```python
from openai import OpenAI
client = OpenAI()

run = client.evals.runs.retrieve("YOUR_EVAL_ID", "YOUR_RUN_ID")
print(run)
```

You'll need the UUID of both your eval and eval run to fetch its status. When you do, you'll see eval run data that looks like this:

```json
{
  "object": "eval.run",
  "id": "evalrun_67e44c73eb6481909f79a457749222c7",
  "eval_id": "eval_67e44c5becec81909704be0318146157",
  "report_url": "https://platform.openai.com/evaluations/xxx",
  "status": "completed",
  "model": "gpt-4.1",
  "name": "Categorization text run",
  "created_at": 1743015028,
  "result_counts": {
    "total": 3,
    "errored": 0,
    "failed": 0,
    "passed": 3
  },
  "per_model_usage": [
    {
      "model_name": "gpt-4o-2024-08-06",
      "invocation_count": 3,
      "prompt_tokens": 166,
      "completion_tokens": 6,
      "total_tokens": 172,
      "cached_tokens": 0
    }
  ],
  "per_testing_criteria_results": [
    {
      "testing_criteria": "Match output to human label-40d67441-5000-4754-ab8c-181c125803ce",
      "passed": 3,
      "failed": 0
    }
  ],
  "data_source": {
    "type": "responses",
    "source": {
      "type": "file_id",
      "id": "file-J7MoX9ToHXp2TutMEeYnwj"
    },
    "input_messages": {
      "type": "template",
      "template": [
        {
          "type": "message",
          "role": "developer",
          "content": {
            "type": "input_text",
            "text": "You are an expert in categorizing IT support tickets. Given the support ticket below, categorize the request into one of Hardware, Software, or Other. Respond with only one of those words."
          }
        },
        {
          "type": "message",
          "role": "user",
          "content": {
            "type": "input_text",
            "text": "{{item.ticket_text}}"
          }
        }
      ]
    },
    "model": "gpt-4.1",
    "sampling_params": null
  },
  "error": null,
  "metadata": {}
}
```

The API response contains granular information about test criteria results, API usage for generating model responses, and a `report_url` property that takes you to a page in the dashboard where you can explore the results visually.

In our simple test, the model reliably generated the content we wanted for a small test case sample. In reality, you will often have to run your eval with more criteria, different prompts, and different data sets. But the process above gives you all the tools you need to build robust evals for your LLM apps!

## Next steps

Now you know how to create and run evals via API, and using the dashboard! Here are a few other resources that may be useful to you as you continue to improve your model results.

[

Cookbook: Detecting prompt regressions

Keep tabs on the performance of your prompts as you iterate on them.

](https://cookbook.openai.com/examples/evaluation/use-cases/regression)[

Cookbook: Bulk model and prompt experimentation

Compare the results of many different prompts and models at once.

](https://cookbook.openai.com/examples/evaluation/use-cases/bulk-experimentation)[

Cookbook: Monitoring stored completions

Examine stored completions to test for prompt regressions.

](https://cookbook.openai.com/examples/evaluation/use-cases/completion-monitoring)[

Fine-tuning

Improve a model's ability to generate responses tailored to your use case.

](/docs/guides/fine-tuning)[

Model distillation

Learn how to distill large model results to smaller, cheaper, and faster models.

](/docs/guides/distillation)

Evals

Create, manage, and run evals in the OpenAI platform. Related guide: Evals
Create eval
post https://api.openai.com/v1/evals

Create the structure of an evaluation that can be used to test a model's performance. An evaluation is a set of testing criteria and the config for a data source, which dictates the schema of the data used in the evaluation. After creating an evaluation, you can run it on different models and model parameters. We support several types of graders and datasources. For more information, see the Evals guide.
Request body
data_source_config

object
Required

The configuration for the data source used for the evaluation runs. Dictates the schema of the data used in the evaluation.
testing_criteria

array
Required

A list of graders for all eval runs in this group. Graders can reference variables in the data source using double curly braces notation, like {{item.variable_name}}. To reference the model's output, use the sample namespace (ie, {{sample.output_text}}).
metadata

map
Optional

Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard.

Keys are strings with a maximum length of 64 characters. Values are strings with a maximum length of 512 characters.
name

string
Optional

The name of the evaluation.
Returns

The created Eval object.
Example request

curl https://api.openai.com/v1/evals \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json" \
 -d '{
"name": "Sentiment",
"data_source_config": {
"type": "stored_completions",
"metadata": {
"usecase": "chatbot"
}
},
"testing_criteria": [
{
"type": "label_model",
"model": "o3-mini",
"input": [
{
"role": "developer",
"content": "Classify the sentiment of the following statement as one of 'positive', 'neutral', or 'negative'"
},
{
"role": "user",
"content": "Statement: {{item.input}}"
}
],
"passing_labels": [
"positive"
],
"labels": [
"positive",
"neutral",
"negative"
],
"name": "Example label grader"
}
]
}'

Response

{
"object": "eval",
"id": "eval_67b7fa9a81a88190ab4aa417e397ea21",
"data_source_config": {
"type": "stored_completions",
"metadata": {
"usecase": "chatbot"
},
"schema": {
"type": "object",
"properties": {
"item": {
"type": "object"
},
"sample": {
"type": "object"
}
},
"required": [
"item",
"sample"
]
},
"testing_criteria": [
{
"name": "Example label grader",
"type": "label_model",
"model": "o3-mini",
"input": [
{
"type": "message",
"role": "developer",
"content": {
"type": "input_text",
"text": "Classify the sentiment of the following statement as one of positive, neutral, or negative"
}
},
{
"type": "message",
"role": "user",
"content": {
"type": "input_text",
"text": "Statement: {{item.input}}"
}
}
],
"passing_labels": [
"positive"
],
"labels": [
"positive",
"neutral",
"negative"
]
}
],
"name": "Sentiment",
"created_at": 1740110490,
"metadata": {
"description": "An eval for sentiment analysis"
}
}

Get an eval
get https://api.openai.com/v1/evals/{eval_id}

Get an evaluation by ID.
Path parameters
eval_id

string
Required

The ID of the evaluation to retrieve.
Returns

The Eval object matching the specified ID.
Example request

curl https://api.openai.com/v1/evals/eval_67abd54d9b0081909a86353f6fb9317a \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json"

Response

{
"object": "eval",
"id": "eval_67abd54d9b0081909a86353f6fb9317a",
"data_source_config": {
"type": "custom",
"schema": {
"type": "object",
"properties": {
"item": {
"type": "object",
"properties": {
"input": {
"type": "string"
},
"ground_truth": {
"type": "string"
}
},
"required": [
"input",
"ground_truth"
]
}
},
"required": [
"item"
]
}
},
"testing_criteria": [
{
"name": "String check",
"id": "String check-2eaf2d8d-d649-4335-8148-9535a7ca73c2",
"type": "string_check",
"input": "{{item.input}}",
"reference": "{{item.ground_truth}}",
"operation": "eq"
}
],
"name": "External Data Eval",
"created_at": 1739314509,
"metadata": {},
}

Update an eval
post https://api.openai.com/v1/evals/{eval_id}

Update certain properties of an evaluation.
Path parameters
eval_id

string
Required

The ID of the evaluation to update.
Request body
metadata

map
Optional

Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard.

Keys are strings with a maximum length of 64 characters. Values are strings with a maximum length of 512 characters.
name

string
Optional

Rename the evaluation.
Returns

The Eval object matching the updated version.
Example request

curl https://api.openai.com/v1/evals/eval_67abd54d9b0081909a86353f6fb9317a \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json" \
 -d '{"name": "Updated Eval", "metadata": {"description": "Updated description"}}'

Response

{
"object": "eval",
"id": "eval_67abd54d9b0081909a86353f6fb9317a",
"data_source_config": {
"type": "custom",
"schema": {
"type": "object",
"properties": {
"item": {
"type": "object",
"properties": {
"input": {
"type": "string"
},
"ground_truth": {
"type": "string"
}
},
"required": [
"input",
"ground_truth"
]
}
},
"required": [
"item"
]
}
},
"testing_criteria": [
{
"name": "String check",
"id": "String check-2eaf2d8d-d649-4335-8148-9535a7ca73c2",
"type": "string_check",
"input": "{{item.input}}",
"reference": "{{item.ground_truth}}",
"operation": "eq"
}
],
"name": "Updated Eval",
"created_at": 1739314509,
"metadata": {"description": "Updated description"},
}

Delete an eval
delete https://api.openai.com/v1/evals/{eval_id}

Delete an evaluation.
Path parameters
eval_id

string
Required

The ID of the evaluation to delete.
Returns

A deletion confirmation object.
Example request

curl https://api.openai.com/v1/evals/eval_abc123 \
 -X DELETE \
 -H "Authorization: Bearer $OPENAI_API_KEY"

Response

{
"object": "eval.deleted",
"deleted": true,
"eval_id": "eval_abc123"
}

List evals
get https://api.openai.com/v1/evals

List evaluations for a project.
Query parameters
after

string
Optional

Identifier for the last eval from the previous pagination request.
limit

integer
Optional
Defaults to 20

Number of evals to retrieve.
order

string
Optional
Defaults to asc

Sort order for evals by timestamp. Use asc for ascending order or desc for descending order.
order_by

string
Optional
Defaults to created_at

Evals can be ordered by creation time or last updated time. Use created_at for creation time or updated_at for last updated time.
Returns

A list of evals matching the specified filters.
Example request

curl https://api.openai.com/v1/evals?limit=1 \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json"

Response

{
"object": "list",
"data": [
{
"id": "eval_67abd54d9b0081909a86353f6fb9317a",
"object": "eval",
"data_source_config": {
"type": "stored_completions",
"metadata": {
"usecase": "push_notifications_summarizer"
},
"schema": {
"type": "object",
"properties": {
"item": {
"type": "object"
},
"sample": {
"type": "object"
}
},
"required": [
"item",
"sample"
]
}
},
"testing_criteria": [
{
"name": "Push Notification Summary Grader",
"id": "Push Notification Summary Grader-9b876f24-4762-4be9-aff4-db7a9b31c673",
"type": "label_model",
"model": "o3-mini",
"input": [
{
"type": "message",
"role": "developer",
"content": {
"type": "input_text",
"text": "\nLabel the following push notification summary as either correct or incorrect.\nThe push notification and the summary will be provided below.\nA good push notificiation summary is concise and snappy.\nIf it is good, then label it as correct, if not, then incorrect.\n"
}
},
{
"type": "message",
"role": "user",
"content": {
"type": "input_text",
"text": "\nPush notifications: {{item.input}}\nSummary: {{sample.output_text}}\n"
}
}
],
"passing_labels": [
"correct"
],
"labels": [
"correct",
"incorrect"
],
"sampling_params": null
}
],
"name": "Push Notification Summary Grader",
"created_at": 1739314509,
"metadata": {
"description": "A stored completions eval for push notification summaries"
}
}
],
"first_id": "eval_67abd54d9b0081909a86353f6fb9317a",
"last_id": "eval_67aa884cf6688190b58f657d4441c8b7",
"has_more": true
}

Get eval runs
get https://api.openai.com/v1/evals/{eval_id}/runs

Get a list of runs for an evaluation.
Path parameters
eval_id

string
Required

The ID of the evaluation to retrieve runs for.
Query parameters
after

string
Optional

Identifier for the last run from the previous pagination request.
limit

integer
Optional
Defaults to 20

Number of runs to retrieve.
order

string
Optional
Defaults to asc

Sort order for runs by timestamp. Use asc for ascending order or desc for descending order. Defaults to asc.
status

string
Optional

Filter runs by status. One of queued | in_progress | failed | completed | canceled.
Returns

A list of EvalRun objects matching the specified ID.
Example request

curl https://api.openai.com/v1/evals/egroup_67abd54d9b0081909a86353f6fb9317a/runs \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json"

Response

{
"object": "list",
"data": [
{
"object": "eval.run",
"id": "evalrun_67e0c7d31560819090d60c0780591042",
"eval_id": "eval_67e0c726d560819083f19a957c4c640b",
"report_url": "https://platform.openai.com/evaluations/eval_67e0c726d560819083f19a957c4c640b",
"status": "completed",
"model": "o3-mini",
"name": "bulk_with_negative_examples_o3-mini",
"created_at": 1742784467,
"result_counts": {
"total": 1,
"errored": 0,
"failed": 0,
"passed": 1
},
"per_model_usage": [
{
"model_name": "o3-mini",
"invocation_count": 1,
"prompt_tokens": 563,
"completion_tokens": 874,
"total_tokens": 1437,
"cached_tokens": 0
}
],
"per_testing_criteria_results": [
{
"testing_criteria": "Push Notification Summary Grader-1808cd0b-eeec-4e0b-a519-337e79f4f5d1",
"passed": 1,
"failed": 0
}
],
"data_source": {
"type": "completions",
"source": {
"type": "file_content",
"content": [
{
"item": {
"notifications": "\n- New message from Sarah: \"Can you call me later?\"\n- Your package has been delivered!\n- Flash sale: 20% off electronics for the next 2 hours!\n"
}
}
]
},
"input_messages": {
"type": "template",
"template": [
{
"type": "message",
"role": "developer",
"content": {
"type": "input_text",
"text": "\n\n\n\nYou are a helpful assistant that takes in an array of push notifications and returns a collapsed summary of them.\nThe push notification will be provided as follows:\n<push_notifications>\n...notificationlist...\n</push_notifications>\n\nYou should return just the summary and nothing else.\n\n\nYou should return a summary that is concise and snappy.\n\n\nHere is an example of a good summary:\n<push_notifications>\n- Traffic alert: Accident reported on Main Street.- Package out for delivery: Expected by 5 PM.- New friend suggestion: Connect with Emma.\n</push_notifications>\n<summary>\nTraffic alert, package expected by 5pm, suggestion for new friend (Emily).\n</summary>\n\n\nHere is an example of a bad summary:\n<push_notifications>\n- Traffic alert: Accident reported on Main Street.- Package out for delivery: Expected by 5 PM.- New friend suggestion: Connect with Emma.\n</push_notifications>\n<summary>\nTraffic alert reported on main street. You have a package that will arrive by 5pm, Emily is a new friend suggested for you.\n</summary>\n"
}
},
{
"type": "message",
"role": "user",
"content": {
"type": "input_text",
"text": "<push_notifications>{{item.notifications}}</push_notifications>"
}
}
]
},
"model": "o3-mini",
"sampling_params": null
},
"error": null,
"metadata": {}
}
],
"first_id": "evalrun_67e0c7d31560819090d60c0780591042",
"last_id": "evalrun_67e0c7d31560819090d60c0780591042",
"has_more": true
}

Get an eval run
get https://api.openai.com/v1/evals/{eval_id}/runs/{run_id}

Get an evaluation run by ID.
Path parameters
eval_id

string
Required

The ID of the evaluation to retrieve runs for.
run_id

string
Required

The ID of the run to retrieve.
Returns

The EvalRun object matching the specified ID.
Example request

curl https://api.openai.com/v1/evals/eval_67abd54d9b0081909a86353f6fb9317a/runs/evalrun_67abd54d60ec8190832b46859da808f7 \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json"

Response

{
"object": "eval.run",
"id": "evalrun_67abd54d60ec8190832b46859da808f7",
"eval_id": "eval_67abd54d9b0081909a86353f6fb9317a",
"report_url": "https://platform.openai.com/evaluations/eval_67abd54d9b0081909a86353f6fb9317a?run_id=evalrun_67abd54d60ec8190832b46859da808f7",
"status": "queued",
"model": "gpt-4o-mini",
"name": "gpt-4o-mini",
"created_at": 1743092069,
"result_counts": {
"total": 0,
"errored": 0,
"failed": 0,
"passed": 0
},
"per_model_usage": null,
"per_testing_criteria_results": null,
"data_source": {
"type": "completions",
"source": {
"type": "file_content",
"content": [
{
"item": {
"input": "Tech Company Launches Advanced Artificial Intelligence Platform",
"ground_truth": "Technology"
}
},
{
"item": {
"input": "Central Bank Increases Interest Rates Amid Inflation Concerns",
"ground_truth": "Markets"
}
},
{
"item": {
"input": "International Summit Addresses Climate Change Strategies",
"ground_truth": "World"
}
},
{
"item": {
"input": "Major Retailer Reports Record-Breaking Holiday Sales",
"ground_truth": "Business"
}
},
{
"item": {
"input": "National Team Qualifies for World Championship Finals",
"ground_truth": "Sports"
}
},
{
"item": {
"input": "Stock Markets Rally After Positive Economic Data Released",
"ground_truth": "Markets"
}
},
{
"item": {
"input": "Global Manufacturer Announces Merger with Competitor",
"ground_truth": "Business"
}
},
{
"item": {
"input": "Breakthrough in Renewable Energy Technology Unveiled",
"ground_truth": "Technology"
}
},
{
"item": {
"input": "World Leaders Sign Historic Climate Agreement",
"ground_truth": "World"
}
},
{
"item": {
"input": "Professional Athlete Sets New Record in Championship Event",
"ground_truth": "Sports"
}
},
{
"item": {
"input": "Financial Institutions Adapt to New Regulatory Requirements",
"ground_truth": "Business"
}
},
{
"item": {
"input": "Tech Conference Showcases Advances in Artificial Intelligence",
"ground_truth": "Technology"
}
},
{
"item": {
"input": "Global Markets Respond to Oil Price Fluctuations",
"ground_truth": "Markets"
}
},
{
"item": {
"input": "International Cooperation Strengthened Through New Treaty",
"ground_truth": "World"
}
},
{
"item": {
"input": "Sports League Announces Revised Schedule for Upcoming Season",
"ground_truth": "Sports"
}
}
]
},
"input_messages": {
"type": "template",
"template": [
{
"type": "message",
"role": "developer",
"content": {
"type": "input_text",
"text": "Categorize a given news headline into one of the following topics: Technology, Markets, World, Business, or Sports.\n\n# Steps\n\n1. Analyze the content of the news headline to understand its primary focus.\n2. Extract the subject matter, identifying any key indicators or keywords.\n3. Use the identified indicators to determine the most suitable category out of the five options: Technology, Markets, World, Business, or Sports.\n4. Ensure only one category is selected per headline.\n\n# Output Format\n\nRespond with the chosen category as a single word. For instance: \"Technology\", \"Markets\", \"World\", \"Business\", or \"Sports\".\n\n# Examples\n\n**Input**: \"Apple Unveils New iPhone Model, Featuring Advanced AI Features\" \n**Output**: \"Technology\"\n\n**Input**: \"Global Stocks Mixed as Investors Await Central Bank Decisions\" \n**Output**: \"Markets\"\n\n**Input**: \"War in Ukraine: Latest Updates on Negotiation Status\" \n**Output**: \"World\"\n\n**Input**: \"Microsoft in Talks to Acquire Gaming Company for $2 Billion\" \n**Output**: \"Business\"\n\n**Input**: \"Manchester United Secures Win in Premier League Football Match\" \n**Output**: \"Sports\" \n\n# Notes\n\n- If the headline appears to fit into more than one category, choose the most dominant theme.\n- Keywords or phrases such as \"stocks\", \"company acquisition\", \"match\", or technological brands can be good indicators for classification.\n"
}
},
{
"type": "message",
"role": "user",
"content": {
"type": "input_text",
"text": "{{item.input}}"
}
}
]
},
"model": "gpt-4o-mini",
"sampling_params": {
"seed": 42,
"temperature": 1.0,
"top_p": 1.0,
"max_completions_tokens": 2048
}
},
"error": null,
"metadata": {}
}

Create eval run
post https://api.openai.com/v1/evals/{eval_id}/runs

Kicks off a new run for a given evaluation, specifying the data source, and what model configuration to use to test. The datasource will be validated against the schema specified in the config of the evaluation.
Path parameters
eval_id

string
Required

The ID of the evaluation to create a run for.
Request body
data_source

object
Required

Details about the run's data source.
metadata

map
Optional

Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard.

Keys are strings with a maximum length of 64 characters. Values are strings with a maximum length of 512 characters.
name

string
Optional

The name of the run.
Returns

The EvalRun object matching the specified ID.
Example request

curl https://api.openai.com/v1/evals/eval_67e579652b548190aaa83ada4b125f47/runs \
 -X POST \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json" \
 -d '{"name":"gpt-4o-mini","data_source":{"type":"completions","input_messages":{"type":"template","template":[{"role":"developer","content":"Categorize a given news headline into one of the following topics: Technology, Markets, World, Business, or Sports.\n\n# Steps\n\n1. Analyze the content of the news headline to understand its primary focus.\n2. Extract the subject matter, identifying any key indicators or keywords.\n3. Use the identified indicators to determine the most suitable category out of the five options: Technology, Markets, World, Business, or Sports.\n4. Ensure only one category is selected per headline.\n\n# Output Format\n\nRespond with the chosen category as a single word. For instance: \"Technology\", \"Markets\", \"World\", \"Business\", or \"Sports\".\n\n# Examples\n\n**Input**: \"Apple Unveils New iPhone Model, Featuring Advanced AI Features\" \n**Output**: \"Technology\"\n\n**Input**: \"Global Stocks Mixed as Investors Await Central Bank Decisions\" \n**Output**: \"Markets\"\n\n**Input**: \"War in Ukraine: Latest Updates on Negotiation Status\" \n**Output**: \"World\"\n\n**Input**: \"Microsoft in Talks to Acquire Gaming Company for $2 Billion\" \n**Output**: \"Business\"\n\n**Input**: \"Manchester United Secures Win in Premier League Football Match\" \n**Output**: \"Sports\" \n\n# Notes\n\n- If the headline appears to fit into more than one category, choose the most dominant theme.\n- Keywords or phrases such as \"stocks\", \"company acquisition\", \"match\", or technological brands can be good indicators for classification.\n"} , {"role":"user","content":"{{item.input}}"}]} ,"sampling_params":{"temperature":1,"max_completions_tokens":2048,"top_p":1,"seed":42},"model":"gpt-4o-mini","source":{"type":"file_content","content":[{"item":{"input":"Tech Company Launches Advanced Artificial Intelligence Platform","ground_truth":"Technology"}}]}}'

Response

{
"object": "eval.run",
"id": "evalrun_67e57965b480819094274e3a32235e4c",
"eval_id": "eval_67e579652b548190aaa83ada4b125f47",
"report_url": "https://platform.openai.com/evaluations/eval_67e579652b548190aaa83ada4b125f47&run_id=evalrun_67e57965b480819094274e3a32235e4c",
"status": "queued",
"model": "gpt-4o-mini",
"name": "gpt-4o-mini",
"created_at": 1743092069,
"result_counts": {
"total": 0,
"errored": 0,
"failed": 0,
"passed": 0
},
"per_model_usage": null,
"per_testing_criteria_results": null,
"data_source": {
"type": "completions",
"source": {
"type": "file_content",
"content": [
{
"item": {
"input": "Tech Company Launches Advanced Artificial Intelligence Platform",
"ground_truth": "Technology"
}
}
]
},
"input_messages": {
"type": "template",
"template": [
{
"type": "message",
"role": "developer",
"content": {
"type": "input_text",
"text": "Categorize a given news headline into one of the following topics: Technology, Markets, World, Business, or Sports.\n\n# Steps\n\n1. Analyze the content of the news headline to understand its primary focus.\n2. Extract the subject matter, identifying any key indicators or keywords.\n3. Use the identified indicators to determine the most suitable category out of the five options: Technology, Markets, World, Business, or Sports.\n4. Ensure only one category is selected per headline.\n\n# Output Format\n\nRespond with the chosen category as a single word. For instance: \"Technology\", \"Markets\", \"World\", \"Business\", or \"Sports\".\n\n# Examples\n\n**Input**: \"Apple Unveils New iPhone Model, Featuring Advanced AI Features\" \n**Output**: \"Technology\"\n\n**Input**: \"Global Stocks Mixed as Investors Await Central Bank Decisions\" \n**Output**: \"Markets\"\n\n**Input**: \"War in Ukraine: Latest Updates on Negotiation Status\" \n**Output**: \"World\"\n\n**Input**: \"Microsoft in Talks to Acquire Gaming Company for $2 Billion\" \n**Output**: \"Business\"\n\n**Input**: \"Manchester United Secures Win in Premier League Football Match\" \n**Output**: \"Sports\" \n\n# Notes\n\n- If the headline appears to fit into more than one category, choose the most dominant theme.\n- Keywords or phrases such as \"stocks\", \"company acquisition\", \"match\", or technological brands can be good indicators for classification.\n"
}
},
{
"type": "message",
"role": "user",
"content": {
"type": "input_text",
"text": "{{item.input}}"
}
}
]
},
"model": "gpt-4o-mini",
"sampling_params": {
"seed": 42,
"temperature": 1.0,
"top_p": 1.0,
"max_completions_tokens": 2048
}
},
"error": null,
"metadata": {}
}

Cancel eval run
post https://api.openai.com/v1/evals/{eval_id}/runs/{run_id}

Cancel an ongoing evaluation run.
Path parameters
eval_id

string
Required

The ID of the evaluation whose run you want to cancel.
run_id

string
Required

The ID of the run to cancel.
Returns

The updated EvalRun object reflecting that the run is canceled.
Example request

curl https://api.openai.com/v1/evals/eval_67abd54d9b0081909a86353f6fb9317a/runs/evalrun_67abd54d60ec8190832b46859da808f7/cancel \
 -X POST \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json"

Response

{
"object": "eval.run",
"id": "evalrun_67abd54d60ec8190832b46859da808f7",
"eval_id": "eval_67abd54d9b0081909a86353f6fb9317a",
"report_url": "https://platform.openai.com/evaluations/eval_67abd54d9b0081909a86353f6fb9317a?run_id=evalrun_67abd54d60ec8190832b46859da808f7",
"status": "canceled",
"model": "gpt-4o-mini",
"name": "gpt-4o-mini",
"created_at": 1743092069,
"result_counts": {
"total": 0,
"errored": 0,
"failed": 0,
"passed": 0
},
"per_model_usage": null,
"per_testing_criteria_results": null,
"data_source": {
"type": "completions",
"source": {
"type": "file_content",
"content": [
{
"item": {
"input": "Tech Company Launches Advanced Artificial Intelligence Platform",
"ground_truth": "Technology"
}
},
{
"item": {
"input": "Central Bank Increases Interest Rates Amid Inflation Concerns",
"ground_truth": "Markets"
}
},
{
"item": {
"input": "International Summit Addresses Climate Change Strategies",
"ground_truth": "World"
}
},
{
"item": {
"input": "Major Retailer Reports Record-Breaking Holiday Sales",
"ground_truth": "Business"
}
},
{
"item": {
"input": "National Team Qualifies for World Championship Finals",
"ground_truth": "Sports"
}
},
{
"item": {
"input": "Stock Markets Rally After Positive Economic Data Released",
"ground_truth": "Markets"
}
},
{
"item": {
"input": "Global Manufacturer Announces Merger with Competitor",
"ground_truth": "Business"
}
},
{
"item": {
"input": "Breakthrough in Renewable Energy Technology Unveiled",
"ground_truth": "Technology"
}
},
{
"item": {
"input": "World Leaders Sign Historic Climate Agreement",
"ground_truth": "World"
}
},
{
"item": {
"input": "Professional Athlete Sets New Record in Championship Event",
"ground_truth": "Sports"
}
},
{
"item": {
"input": "Financial Institutions Adapt to New Regulatory Requirements",
"ground_truth": "Business"
}
},
{
"item": {
"input": "Tech Conference Showcases Advances in Artificial Intelligence",
"ground_truth": "Technology"
}
},
{
"item": {
"input": "Global Markets Respond to Oil Price Fluctuations",
"ground_truth": "Markets"
}
},
{
"item": {
"input": "International Cooperation Strengthened Through New Treaty",
"ground_truth": "World"
}
},
{
"item": {
"input": "Sports League Announces Revised Schedule for Upcoming Season",
"ground_truth": "Sports"
}
}
]
},
"input_messages": {
"type": "template",
"template": [
{
"type": "message",
"role": "developer",
"content": {
"type": "input_text",
"text": "Categorize a given news headline into one of the following topics: Technology, Markets, World, Business, or Sports.\n\n# Steps\n\n1. Analyze the content of the news headline to understand its primary focus.\n2. Extract the subject matter, identifying any key indicators or keywords.\n3. Use the identified indicators to determine the most suitable category out of the five options: Technology, Markets, World, Business, or Sports.\n4. Ensure only one category is selected per headline.\n\n# Output Format\n\nRespond with the chosen category as a single word. For instance: \"Technology\", \"Markets\", \"World\", \"Business\", or \"Sports\".\n\n# Examples\n\n**Input**: \"Apple Unveils New iPhone Model, Featuring Advanced AI Features\" \n**Output**: \"Technology\"\n\n**Input**: \"Global Stocks Mixed as Investors Await Central Bank Decisions\" \n**Output**: \"Markets\"\n\n**Input**: \"War in Ukraine: Latest Updates on Negotiation Status\" \n**Output**: \"World\"\n\n**Input**: \"Microsoft in Talks to Acquire Gaming Company for $2 Billion\" \n**Output**: \"Business\"\n\n**Input**: \"Manchester United Secures Win in Premier League Football Match\" \n**Output**: \"Sports\" \n\n# Notes\n\n- If the headline appears to fit into more than one category, choose the most dominant theme.\n- Keywords or phrases such as \"stocks\", \"company acquisition\", \"match\", or technological brands can be good indicators for classification.\n"
}
},
{
"type": "message",
"role": "user",
"content": {
"type": "input_text",
"text": "{{item.input}}"
}
}
]
},
"model": "gpt-4o-mini",
"sampling_params": {
"seed": 42,
"temperature": 1.0,
"top_p": 1.0,
"max_completions_tokens": 2048
}
},
"error": null,
"metadata": {}
}

Delete eval run
delete https://api.openai.com/v1/evals/{eval_id}/runs/{run_id}

Delete an eval run.
Path parameters
eval_id

string
Required

The ID of the evaluation to delete the run from.
run_id

string
Required

The ID of the run to delete.
Returns

An object containing the status of the delete operation.
Example request

curl https://api.openai.com/v1/evals/eval_123abc/runs/evalrun_abc456 \
 -X DELETE \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json"

Response

{
"object": "eval.run.deleted",
"deleted": true,
"run_id": "evalrun_abc456"
}

Get an output item of an eval run
get https://api.openai.com/v1/evals/{eval_id}/runs/{run_id}/output_items/{output_item_id}

Get an evaluation run output item by ID.
Path parameters
eval_id

string
Required

The ID of the evaluation to retrieve runs for.
output_item_id

string
Required

The ID of the output item to retrieve.
run_id

string
Required

The ID of the run to retrieve.
Returns

The EvalRunOutputItem object matching the specified ID.
Example request

curl https://api.openai.com/v1/evals/eval_67abd54d9b0081909a86353f6fb9317a/runs/evalrun_67abd54d60ec8190832b46859da808f7/output_items/outputitem_67abd55eb6548190bb580745d5644a33 \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json"

Response

{
"object": "eval.run.output_item",
"id": "outputitem_67e5796c28e081909917bf79f6e6214d",
"created_at": 1743092076,
"run_id": "evalrun_67abd54d60ec8190832b46859da808f7",
"eval_id": "eval_67abd54d9b0081909a86353f6fb9317a",
"status": "pass",
"datasource_item_id": 5,
"datasource_item": {
"input": "Stock Markets Rally After Positive Economic Data Released",
"ground_truth": "Markets"
},
"results": [
{
"name": "String check-a2486074-d803-4445-b431-ad2262e85d47",
"sample": null,
"passed": true,
"score": 1.0
}
],
"sample": {
"input": [
{
"role": "developer",
"content": "Categorize a given news headline into one of the following topics: Technology, Markets, World, Business, or Sports.\n\n# Steps\n\n1. Analyze the content of the news headline to understand its primary focus.\n2. Extract the subject matter, identifying any key indicators or keywords.\n3. Use the identified indicators to determine the most suitable category out of the five options: Technology, Markets, World, Business, or Sports.\n4. Ensure only one category is selected per headline.\n\n# Output Format\n\nRespond with the chosen category as a single word. For instance: \"Technology\", \"Markets\", \"World\", \"Business\", or \"Sports\".\n\n# Examples\n\n**Input**: \"Apple Unveils New iPhone Model, Featuring Advanced AI Features\" \n**Output**: \"Technology\"\n\n**Input**: \"Global Stocks Mixed as Investors Await Central Bank Decisions\" \n**Output**: \"Markets\"\n\n**Input**: \"War in Ukraine: Latest Updates on Negotiation Status\" \n**Output**: \"World\"\n\n**Input**: \"Microsoft in Talks to Acquire Gaming Company for $2 Billion\" \n**Output**: \"Business\"\n\n**Input**: \"Manchester United Secures Win in Premier League Football Match\" \n**Output**: \"Sports\" \n\n# Notes\n\n- If the headline appears to fit into more than one category, choose the most dominant theme.\n- Keywords or phrases such as \"stocks\", \"company acquisition\", \"match\", or technological brands can be good indicators for classification.\n",
"tool_call_id": null,
"tool_calls": null,
"function_call": null
},
{
"role": "user",
"content": "Stock Markets Rally After Positive Economic Data Released",
"tool_call_id": null,
"tool_calls": null,
"function_call": null
}
],
"output": [
{
"role": "assistant",
"content": "Markets",
"tool_call_id": null,
"tool_calls": null,
"function_call": null
}
],
"finish_reason": "stop",
"model": "gpt-4o-mini-2024-07-18",
"usage": {
"total_tokens": 325,
"completion_tokens": 2,
"prompt_tokens": 323,
"cached_tokens": 0
},
"error": null,
"temperature": 1.0,
"max_completion_tokens": 2048,
"top_p": 1.0,
"seed": 42
}
}

Get eval run output items
get https://api.openai.com/v1/evals/{eval_id}/runs/{run_id}/output_items

Get a list of output items for an evaluation run.
Path parameters
eval_id

string
Required

The ID of the evaluation to retrieve runs for.
run_id

string
Required

The ID of the run to retrieve output items for.
Query parameters
after

string
Optional

Identifier for the last output item from the previous pagination request.
limit

integer
Optional
Defaults to 20

Number of output items to retrieve.
order

string
Optional
Defaults to asc

Sort order for output items by timestamp. Use asc for ascending order or desc for descending order. Defaults to asc.
status

string
Optional

Filter output items by status. Use failed to filter by failed output items or pass to filter by passed output items.
Returns

A list of EvalRunOutputItem objects matching the specified ID.
Example request

curl https://api.openai.com/v1/evals/egroup_67abd54d9b0081909a86353f6fb9317a/runs/erun_67abd54d60ec8190832b46859da808f7/output_items \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -H "Content-Type: application/json"

Response

{
"object": "list",
"data": [
{
"object": "eval.run.output_item",
"id": "outputitem_67e5796c28e081909917bf79f6e6214d",
"created_at": 1743092076,
"run_id": "evalrun_67abd54d60ec8190832b46859da808f7",
"eval_id": "eval_67abd54d9b0081909a86353f6fb9317a",
"status": "pass",
"datasource_item_id": 5,
"datasource_item": {
"input": "Stock Markets Rally After Positive Economic Data Released",
"ground_truth": "Markets"
},
"results": [
{
"name": "String check-a2486074-d803-4445-b431-ad2262e85d47",
"sample": null,
"passed": true,
"score": 1.0
}
],
"sample": {
"input": [
{
"role": "developer",
"content": "Categorize a given news headline into one of the following topics: Technology, Markets, World, Business, or Sports.\n\n# Steps\n\n1. Analyze the content of the news headline to understand its primary focus.\n2. Extract the subject matter, identifying any key indicators or keywords.\n3. Use the identified indicators to determine the most suitable category out of the five options: Technology, Markets, World, Business, or Sports.\n4. Ensure only one category is selected per headline.\n\n# Output Format\n\nRespond with the chosen category as a single word. For instance: \"Technology\", \"Markets\", \"World\", \"Business\", or \"Sports\".\n\n# Examples\n\n**Input**: \"Apple Unveils New iPhone Model, Featuring Advanced AI Features\" \n**Output**: \"Technology\"\n\n**Input**: \"Global Stocks Mixed as Investors Await Central Bank Decisions\" \n**Output**: \"Markets\"\n\n**Input**: \"War in Ukraine: Latest Updates on Negotiation Status\" \n**Output**: \"World\"\n\n**Input**: \"Microsoft in Talks to Acquire Gaming Company for $2 Billion\" \n**Output**: \"Business\"\n\n**Input**: \"Manchester United Secures Win in Premier League Football Match\" \n**Output**: \"Sports\" \n\n# Notes\n\n- If the headline appears to fit into more than one category, choose the most dominant theme.\n- Keywords or phrases such as \"stocks\", \"company acquisition\", \"match\", or technological brands can be good indicators for classification.\n",
"tool_call_id": null,
"tool_calls": null,
"function_call": null
},
{
"role": "user",
"content": "Stock Markets Rally After Positive Economic Data Released",
"tool_call_id": null,
"tool_calls": null,
"function_call": null
}
],
"output": [
{
"role": "assistant",
"content": "Markets",
"tool_call_id": null,
"tool_calls": null,
"function_call": null
}
],
"finish_reason": "stop",
"model": "gpt-4o-mini-2024-07-18",
"usage": {
"total_tokens": 325,
"completion_tokens": 2,
"prompt_tokens": 323,
"cached_tokens": 0
},
"error": null,
"temperature": 1.0,
"max_completion_tokens": 2048,
"top_p": 1.0,
"seed": 42
}
}
],
"first_id": "outputitem_67e5796c28e081909917bf79f6e6214d",
"last_id": "outputitem_67e5796c28e081909917bf79f6e6214d",
"has_more": true
}

The eval object

An Eval object with a data source config and testing criteria. An Eval represents a task to be done for your LLM integration. Like:

    Improve the quality of my chatbot
    See how well my chatbot handles customer support
    Check if o4-mini is better at my usecase than gpt-4o

created_at

integer

The Unix timestamp (in seconds) for when the eval was created.
data_source_config

object

Configuration of data sources used in runs of the evaluation.
id

string

Unique identifier for the evaluation.
metadata

map

Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard.

Keys are strings with a maximum length of 64 characters. Values are strings with a maximum length of 512 characters.
name

string

The name of the evaluation.
object

string

The object type.
testing_criteria

array

A list of testing criteria.
OBJECT The eval object

{
"object": "eval",
"id": "eval_67abd54d9b0081909a86353f6fb9317a",
"data_source_config": {
"type": "custom",
"item_schema": {
"type": "object",
"properties": {
"label": {"type": "string"},
},
"required": ["label"]
},
"include_sample_schema": true
},
"testing_criteria": [
{
"name": "My string check grader",
"type": "string_check",
"input": "{{sample.output_text}}",
"reference": "{{item.label}}",
"operation": "eq",
}
],
"name": "External Data Eval",
"created_at": 1739314509,
"metadata": {
"test": "synthetics",
}
}
