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

The eval run object

A schema representing an evaluation run.
created_at

integer

Unix timestamp (in seconds) when the evaluation run was created.
data_source

object

Information about the run's data source.
error

object

An object representing an error response from the Eval API.
eval_id

string

The identifier of the associated evaluation.
id

string

Unique identifier for the evaluation run.
metadata

map

Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard.

Keys are strings with a maximum length of 64 characters. Values are strings with a maximum length of 512 characters.
model

string

The model that is evaluated, if applicable.
name

string

The name of the evaluation run.
object

string

The type of the object. Always "eval.run".
per_model_usage

array

Usage statistics for each model during the evaluation run.
per_testing_criteria_results

array

Results per testing criteria applied during the evaluation run.
report_url

string

The URL to the rendered evaluation run report on the UI dashboard.
result_counts

object

Counters summarizing the outcomes of the evaluation run.
status

string

The status of the evaluation run.
OBJECT The eval run object

{
"object": "eval.run",
"id": "evalrun_67e57965b480819094274e3a32235e4c",
"eval_id": "eval_67e579652b548190aaa83ada4b125f47",
"report_url": "https://platform.openai.com/evaluations/eval_67e579652b548190aaa83ada4b125f47?run_id=evalrun_67e57965b480819094274e3a32235e4c",
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

The eval run output item object

A schema representing an evaluation run output item.
created_at

integer

Unix timestamp (in seconds) when the evaluation run was created.
datasource_item

object

Details of the input data source item.
datasource_item_id

integer

The identifier for the data source item.
eval_id

string

The identifier of the evaluation group.
id

string

Unique identifier for the evaluation run output item.
object

string

The type of the object. Always "eval.run.output_item".
results

array

A list of grader results for this output item.
run_id

string

The identifier of the evaluation run associated with this output item.
sample

object

A sample containing the input and output of the evaluation run.
status

string

The status of the evaluation run.
OBJECT The eval run output item object

{
"object": "eval.run.output_item",
"id": "outputitem_67abd55eb6548190bb580745d5644a33",
"run_id": "evalrun_67abd54d60ec8190832b46859da808f7",
"eval_id": "eval_67abd54d9b0081909a86353f6fb9317a",
"created_at": 1739314509,
"status": "pass",
"datasource_item_id": 137,
"datasource_item": {
"teacher": "To grade essays, I only check for style, content, and grammar.",
"student": "I am a student who is trying to write the best essay."
},
"results": [
{
"name": "String Check Grader",
"type": "string-check-grader",
"score": 1.0,
"passed": true,
}
],
"sample": {
"input": [
{
"role": "system",
"content": "You are an evaluator bot..."
},
{
"role": "user",
"content": "You are assessing..."
}
],
"output": [
{
"role": "assistant",
"content": "The rubric is not clear nor concise."
}
],
"finish_reason": "stop",
"model": "gpt-4o-2024-08-06",
"usage": {

Responses

OpenAI's most advanced interface for generating model responses. Supports text and image inputs, and text outputs. Create stateful interactions with the model, using the output of previous responses as input. Extend the model's capabilities with built-in tools for file search, web search, computer use, and more. Allow the model access to external systems and data using function calling.

Related guides:

    Quickstart
    Text inputs and outputs
    Image inputs
    Structured Outputs
    Function calling
    Conversation state
    Extend the models with tools

Create a model response
post https://api.openai.com/v1/responses

Creates a model response. Provide text or image inputs to generate text or JSON outputs. Have the model call your own custom code or use built-in tools like web search or file search to use your own data as input for the model's response.
Request body
background

boolean
Optional
Defaults to false

Whether to run the model response in the background. Learn more.
conversation

string or object
Optional
Defaults to null

The conversation that this response belongs to. Items from this conversation are prepended to input_items for this response request. Input items and output items from this response are automatically added to this conversation after this response completes.
include

array
Optional

Specify additional output data to include in the model response. Currently supported values are:

    web_search_call.action.sources: Include the sources of the web search tool call.
    code_interpreter_call.outputs: Includes the outputs of python code execution in code interpreter tool call items.
    computer_call_output.output.image_url: Include image urls from the computer call output.
    file_search_call.results: Include the search results of the file search tool call.
    message.input_image.image_url: Include image urls from the input message.
    message.output_text.logprobs: Include logprobs with assistant messages.
    reasoning.encrypted_content: Includes an encrypted version of reasoning tokens in reasoning item outputs. This enables reasoning items to be used in multi-turn conversations when using the Responses API statelessly (like when the store parameter is set to false, or when an organization is enrolled in the zero data retention program).

input

string or array
Optional

Text, image, or file inputs to the model, used to generate a response.

Learn more:

    Text inputs and outputs
    Image inputs
    File inputs
    Conversation state
    Function calling

instructions

string
Optional

A system (or developer) message inserted into the model's context.

When using along with previous_response_id, the instructions from a previous response will not be carried over to the next response. This makes it simple to swap out system (or developer) messages in new responses.
max_output_tokens

integer
Optional

An upper bound for the number of tokens that can be generated for a response, including visible output tokens and reasoning tokens.
max_tool_calls

integer
Optional

The maximum number of total calls to built-in tools that can be processed in a response. This maximum number applies across all built-in tool calls, not per individual tool. Any further attempts to call a tool by the model will be ignored.
metadata

map
Optional

Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard.

Keys are strings with a maximum length of 64 characters. Values are strings with a maximum length of 512 characters.
model

string
Optional

Model ID used to generate the response, like gpt-4o or o3. OpenAI offers a wide range of models with different capabilities, performance characteristics, and price points. Refer to the model guide to browse and compare available models.
parallel_tool_calls

boolean
Optional
Defaults to true

Whether to allow the model to run tool calls in parallel.
previous_response_id

string
Optional

The unique ID of the previous response to the model. Use this to create multi-turn conversations. Learn more about conversation state. Cannot be used in conjunction with conversation.
prompt

object
Optional

Reference to a prompt template and its variables. Learn more.
prompt_cache_key

string
Optional

Used by OpenAI to cache responses for similar requests to optimize your cache hit rates. Replaces the user field. Learn more.
reasoning

object
Optional

gpt-5 and o-series models only

Configuration options for reasoning models.
safety_identifier

string
Optional

A stable identifier used to help detect users of your application that may be violating OpenAI's usage policies. The IDs should be a string that uniquely identifies each user. We recommend hashing their username or email address, in order to avoid sending us any identifying information. Learn more.
service_tier

string
Optional
Defaults to auto

Specifies the processing type used for serving the request.

    If set to 'auto', then the request will be processed with the service tier configured in the Project settings. Unless otherwise configured, the Project will use 'default'.
    If set to 'default', then the request will be processed with the standard pricing and performance for the selected model.
    If set to 'flex' or 'priority', then the request will be processed with the corresponding service tier.
    When not set, the default behavior is 'auto'.

When the service_tier parameter is set, the response body will include the service_tier value based on the processing mode actually used to serve the request. This response value may be different from the value set in the parameter.
store

boolean
Optional
Defaults to true

Whether to store the generated model response for later retrieval via API.
stream

boolean
Optional
Defaults to false

If set to true, the model response data will be streamed to the client as it is generated using server-sent events. See the Streaming section below for more information.
stream_options

object
Optional
Defaults to null

Options for streaming responses. Only set this when you set stream: true.
temperature

number
Optional
Defaults to 1

What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. We generally recommend altering this or top_p but not both.
text

object
Optional

Configuration options for a text response from the model. Can be plain text or structured JSON data. Learn more:

    Text inputs and outputs
    Structured Outputs

tool_choice

string or object
Optional

How the model should select which tool (or tools) to use when generating a response. See the tools parameter to see how to specify which tools the model can call.
tools

array
Optional

An array of tools the model may call while generating a response. You can specify which tool to use by setting the tool_choice parameter.

We support the following categories of tools:

    Built-in tools: Tools that are provided by OpenAI that extend the model's capabilities, like web search or file search. Learn more about built-in tools.
    MCP Tools: Integrations with third-party systems via custom MCP servers or predefined connectors such as Google Drive and SharePoint. Learn more about MCP Tools.
    Function calls (custom tools): Functions that are defined by you, enabling the model to call your own code with strongly typed arguments and outputs. Learn more about function calling. You can also use custom tools to call your own code.

top_logprobs

integer
Optional

An integer between 0 and 20 specifying the number of most likely tokens to return at each token position, each with an associated log probability.
top_p

number
Optional
Defaults to 1

An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.

We generally recommend altering this or temperature but not both.
truncation

string
Optional
Defaults to disabled

The truncation strategy to use for the model response.

    auto: If the input to this Response exceeds the model's context window size, the model will truncate the response to fit the context window by dropping items from the beginning of the conversation.
    disabled (default): If the input size will exceed the context window size for a model, the request will fail with a 400 error.

user
Deprecated

string
Optional

This field is being replaced by safety_identifier and prompt_cache_key. Use prompt_cache_key instead to maintain caching optimizations. A stable identifier for your end-users. Used to boost cache hit rates by better bucketing similar requests and to help OpenAI detect and prevent abuse. Learn more.
Returns

Returns a Response object.
Example request

curl https://api.openai.com/v1/responses \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -d '{
"model": "gpt-4.1",
"input": "Tell me a three sentence bedtime story about a unicorn."
}'

Response

{
"id": "resp_67ccd2bed1ec8190b14f964abc0542670bb6a6b452d3795b",
"object": "response",
"created_at": 1741476542,
"status": "completed",
"error": null,
"incomplete_details": null,
"instructions": null,
"max_output_tokens": null,
"model": "gpt-4.1-2025-04-14",
"output": [
{
"type": "message",
"id": "msg_67ccd2bf17f0819081ff3bb2cf6508e60bb6a6b452d3795b",
"status": "completed",
"role": "assistant",
"content": [
{
"type": "output_text",
"text": "In a peaceful grove beneath a silver moon, a unicorn named Lumina discovered a hidden pool that reflected the stars. As she dipped her horn into the water, the pool began to shimmer, revealing a pathway to a magical realm of endless night skies. Filled with wonder, Lumina whispered a wish for all who dream to find their own hidden magic, and as she glanced back, her hoofprints sparkled like stardust.",
"annotations": []
}
]
}
],
"parallel_tool_calls": true,
"previous_response_id": null,
"reasoning": {
"effort": null,
"summary": null
},
"store": true,
"temperature": 1.0,
"text": {
"format": {
"type": "text"
}
},
"tool_choice": "auto",
"tools": [],
"top_p": 1.0,
"truncation": "disabled",
"usage": {
"input_tokens": 36,
"input_tokens_details": {
"cached_tokens": 0
},
"output_tokens": 87,
"output_tokens_details": {
"reasoning_tokens": 0
},
"total_tokens": 123
},
"user": null,
"metadata": {}
}

Get a model response
get https://api.openai.com/v1/responses/{response_id}

Retrieves a model response with the given ID.
Path parameters
response_id

string
Required

The ID of the response to retrieve.
Query parameters
include

array
Optional

Additional fields to include in the response. See the include parameter for Response creation above for more information.
include_obfuscation

boolean
Optional

When true, stream obfuscation will be enabled. Stream obfuscation adds random characters to an obfuscation field on streaming delta events to normalize payload sizes as a mitigation to certain side-channel attacks. These obfuscation fields are included by default, but add a small amount of overhead to the data stream. You can set include_obfuscation to false to optimize for bandwidth if you trust the network links between your application and the OpenAI API.
starting_after

integer
Optional

The sequence number of the event after which to start streaming.
stream

boolean
Optional

If set to true, the model response data will be streamed to the client as it is generated using server-sent events. See the Streaming section below for more information.
Returns

The Response object matching the specified ID.
Example request

curl https://api.openai.com/v1/responses/resp_123 \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer $OPENAI_API_KEY"

Response

{
"id": "resp_67cb71b351908190a308f3859487620d06981a8637e6bc44",
"object": "response",
"created_at": 1741386163,
"status": "completed",
"error": null,
"incomplete_details": null,
"instructions": null,
"max_output_tokens": null,
"model": "gpt-4o-2024-08-06",
"output": [
{
"type": "message",
"id": "msg_67cb71b3c2b0819084d481baaaf148f206981a8637e6bc44",
"status": "completed",
"role": "assistant",
"content": [
{
"type": "output_text",
"text": "Silent circuits hum, \nThoughts emerge in data streams— \nDigital dawn breaks.",
"annotations": []
}
]
}
],
"parallel_tool_calls": true,
"previous_response_id": null,
"reasoning": {
"effort": null,
"summary": null
},
"store": true,
"temperature": 1.0,
"text": {
"format": {
"type": "text"
}
},
"tool_choice": "auto",
"tools": [],
"top_p": 1.0,
"truncation": "disabled",
"usage": {
"input_tokens": 32,
"input_tokens_details": {
"cached_tokens": 0
},
"output_tokens": 18,
"output_tokens_details": {
"reasoning_tokens": 0
},
"total_tokens": 50
},
"user": null,
"metadata": {}
}

Delete a model response
delete https://api.openai.com/v1/responses/{response_id}

Deletes a model response with the given ID.
Path parameters
response_id

string
Required

The ID of the response to delete.
Returns

A success message.
Example request

curl -X DELETE https://api.openai.com/v1/responses/resp_123 \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer $OPENAI_API_KEY"

Response

{
"id": "resp_6786a1bec27481909a17d673315b29f6",
"object": "response",
"deleted": true
}

Cancel a response
post https://api.openai.com/v1/responses/{response_id}/cancel

Cancels a model response with the given ID. Only responses created with the background parameter set to true can be cancelled. Learn more.
Path parameters
response_id

string
Required

The ID of the response to cancel.
Returns

A Response object.
Example request

curl -X POST https://api.openai.com/v1/responses/resp_123/cancel \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer $OPENAI_API_KEY"

Response

{
"id": "resp_67cb71b351908190a308f3859487620d06981a8637e6bc44",
"object": "response",
"created_at": 1741386163,
"status": "completed",
"error": null,
"incomplete_details": null,
"instructions": null,
"max_output_tokens": null,
"model": "gpt-4o-2024-08-06",
"output": [
{
"type": "message",
"id": "msg_67cb71b3c2b0819084d481baaaf148f206981a8637e6bc44",
"status": "completed",
"role": "assistant",
"content": [
{
"type": "output_text",
"text": "Silent circuits hum, \nThoughts emerge in data streams— \nDigital dawn breaks.",
"annotations": []
}
]
}
],
"parallel_tool_calls": true,
"previous_response_id": null,
"reasoning": {
"effort": null,
"summary": null
},
"store": true,
"temperature": 1.0,
"text": {
"format": {
"type": "text"
}
},
"tool_choice": "auto",
"tools": [],
"top_p": 1.0,
"truncation": "disabled",
"usage": {
"input_tokens": 32,
"input_tokens_details": {
"cached_tokens": 0
},
"output_tokens": 18,
"output_tokens_details": {
"reasoning_tokens": 0
},
"total_tokens": 50
},
"user": null,
"metadata": {}
}

List input items
get https://api.openai.com/v1/responses/{response_id}/input_items

Returns a list of input items for a given response.
Path parameters
response_id

string
Required

The ID of the response to retrieve input items for.
Query parameters
after

string
Optional

An item ID to list items after, used in pagination.
include

array
Optional

Additional fields to include in the response. See the include parameter for Response creation above for more information.
limit

integer
Optional
Defaults to 20

A limit on the number of objects to be returned. Limit can range between 1 and 100, and the default is 20.
order

string
Optional

The order to return the input items in. Default is desc.

    asc: Return the input items in ascending order.
    desc: Return the input items in descending order.

Returns

A list of input item objects.
Example request

curl https://api.openai.com/v1/responses/resp_abc123/input_items \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer $OPENAI_API_KEY"

Response

{
"object": "list",
"data": [
{
"id": "msg_abc123",
"type": "message",
"role": "user",
"content": [
{
"type": "input_text",
"text": "Tell me a three sentence bedtime story about a unicorn."
}
]
}
],
"first_id": "msg_abc123",
"last_id": "msg_abc123",
"has_more": false
}

The response object
background

boolean

Whether to run the model response in the background. Learn more.
conversation

object

The conversation that this response belongs to. Input items and output items from this response are automatically added to this conversation.
created_at

number

Unix timestamp (in seconds) of when this Response was created.
error

object

An error object returned when the model fails to generate a Response.
id

string

Unique identifier for this Response.
incomplete_details

object

Details about why the response is incomplete.
instructions

string or array

A system (or developer) message inserted into the model's context.

When using along with previous_response_id, the instructions from a previous response will not be carried over to the next response. This makes it simple to swap out system (or developer) messages in new responses.
max_output_tokens

integer

An upper bound for the number of tokens that can be generated for a response, including visible output tokens and reasoning tokens.
max_tool_calls

integer

The maximum number of total calls to built-in tools that can be processed in a response. This maximum number applies across all built-in tool calls, not per individual tool. Any further attempts to call a tool by the model will be ignored.
metadata

map

Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format, and querying for objects via API or the dashboard.

Keys are strings with a maximum length of 64 characters. Values are strings with a maximum length of 512 characters.
model

string

Model ID used to generate the response, like gpt-4o or o3. OpenAI offers a wide range of models with different capabilities, performance characteristics, and price points. Refer to the model guide to browse and compare available models.
object

string

The object type of this resource - always set to response.
output

array

An array of content items generated by the model.

    The length and order of items in the output array is dependent on the model's response.
    Rather than accessing the first item in the output array and assuming it's an assistant message with the content generated by the model, you might consider using the output_text property where supported in SDKs.

output_text

string
SDK Only

SDK-only convenience property that contains the aggregated text output from all output_text items in the output array, if any are present. Supported in the Python and JavaScript SDKs.
parallel_tool_calls

boolean

Whether to allow the model to run tool calls in parallel.
previous_response_id

string

The unique ID of the previous response to the model. Use this to create multi-turn conversations. Learn more about conversation state. Cannot be used in conjunction with conversation.
prompt

object

Reference to a prompt template and its variables. Learn more.
prompt_cache_key

string

Used by OpenAI to cache responses for similar requests to optimize your cache hit rates. Replaces the user field. Learn more.
reasoning

object

gpt-5 and o-series models only

Configuration options for reasoning models.
safety_identifier

string

A stable identifier used to help detect users of your application that may be violating OpenAI's usage policies. The IDs should be a string that uniquely identifies each user. We recommend hashing their username or email address, in order to avoid sending us any identifying information. Learn more.
service_tier

string

Specifies the processing type used for serving the request.

    If set to 'auto', then the request will be processed with the service tier configured in the Project settings. Unless otherwise configured, the Project will use 'default'.
    If set to 'default', then the request will be processed with the standard pricing and performance for the selected model.
    If set to 'flex' or 'priority', then the request will be processed with the corresponding service tier.
    When not set, the default behavior is 'auto'.

When the service_tier parameter is set, the response body will include the service_tier value based on the processing mode actually used to serve the request. This response value may be different from the value set in the parameter.
status

string

The status of the response generation. One of completed, failed, in_progress, cancelled, queued, or incomplete.
temperature

number

What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. We generally recommend altering this or top_p but not both.
text

object

Configuration options for a text response from the model. Can be plain text or structured JSON data. Learn more:

    Text inputs and outputs
    Structured Outputs

tool_choice

string or object

How the model should select which tool (or tools) to use when generating a response. See the tools parameter to see how to specify which tools the model can call.
tools

array

An array of tools the model may call while generating a response. You can specify which tool to use by setting the tool_choice parameter.

We support the following categories of tools:

    Built-in tools: Tools that are provided by OpenAI that extend the model's capabilities, like web search or file search. Learn more about built-in tools.
    MCP Tools: Integrations with third-party systems via custom MCP servers or predefined connectors such as Google Drive and SharePoint. Learn more about MCP Tools.
    Function calls (custom tools): Functions that are defined by you, enabling the model to call your own code with strongly typed arguments and outputs. Learn more about function calling. You can also use custom tools to call your own code.

top_logprobs

integer

An integer between 0 and 20 specifying the number of most likely tokens to return at each token position, each with an associated log probability.
top_p

number

An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.

We generally recommend altering this or temperature but not both.
truncation

string

The truncation strategy to use for the model response.

    auto: If the input to this Response exceeds the model's context window size, the model will truncate the response to fit the context window by dropping items from the beginning of the conversation.
    disabled (default): If the input size will exceed the context window size for a model, the request will fail with a 400 error.

usage

object

Represents token usage details including input tokens, output tokens, a breakdown of output tokens, and the total tokens used.
user
Deprecated

string

This field is being replaced by safety_identifier and prompt_cache_key. Use prompt_cache_key instead to maintain caching optimizations. A stable identifier for your end-users. Used to boost cache hit rates by better bucketing similar requests and to help OpenAI detect and prevent abuse. Learn more.
OBJECT The response object

{
"id": "resp_67ccd3a9da748190baa7f1570fe91ac604becb25c45c1d41",
"object": "response",
"created_at": 1741476777,
"status": "completed",
"error": null,
"incomplete_details": null,
"instructions": null,
"max_output_tokens": null,
"model": "gpt-4o-2024-08-06",
"output": [
{
"type": "message",
"id": "msg_67ccd3acc8d48190a77525dc6de64b4104becb25c45c1d41",
"status": "completed",
"role": "assistant",
"content": [
{
"type": "output_text",
"text": "The image depicts a scenic landscape with a wooden boardwalk or pathway leading through lush, green grass under a blue sky with some clouds. The setting suggests a peaceful natural area, possibly a park or nature reserve. There are trees and shrubs in the background.",
"annotations": []
}
]
}
],
"parallel_tool_calls": true,
"previous_response_id": null,
"reasoning": {
"effort": null,
"summary": null
},
"store": true,
"temperature": 1,
"text": {
"format": {
"type": "text"
}
},
"tool_choice": "auto",
"tools": [],
"top_p": 1,
"truncation": "disabled",
"usage": {
"input_tokens": 328,
"input_tokens_details": {
"cached_tokens": 0
},
"output_tokens": 52,
"output_tokens_details": {
"reasoning_tokens": 0
},
"total_tokens": 380
},
"user": null,
"metadata": {}
}

The input item list

A list of Response items.
data

array

A list of items used to generate this response.
first_id

string

The ID of the first item in the list.
has_more

boolean

Whether there are more items available.
last_id

string

The ID of the last item in the list.
object

string

The type of object returned, must be list.
OBJECT The input item list

{
"object": "list",
"data": [
{
"id": "msg_abc123",
"type": "message",
"role": "user",
"content": [
{
"type": "input_text",
"text": "Tell me a three sentence bedtime story about a unicorn."
}
]
}
],
"first_id": "msg_abc123",
"last_id": "msg_abc123",
"has_more": false
}

# Text generation

Learn how to prompt a model to generate text.

With the OpenAI API, you can use a [large language model](/docs/models) to generate text from a prompt, as you might using [ChatGPT](https://chatgpt.com). Models can generate almost any kind of text response—like code, mathematical equations, structured JSON data, or human-like prose.

Here's a simple example using the [Responses API](/docs/api-reference/responses), our recommended API for all new projects.

Generate text from a simple prompt

```javascript
import OpenAI from 'openai'
const client = new OpenAI()

const response = await client.responses.create({
  model: 'gpt-5',
  input: 'Write a one-sentence bedtime story about a unicorn.',
})

console.log(response.output_text)
```

```python
from openai import OpenAI
client = OpenAI()

response = client.responses.create(
    model="gpt-5",
    input="Write a one-sentence bedtime story about a unicorn."
)

print(response.output_text)
```

```csharp
using OpenAI.Responses;

string key = Environment.GetEnvironmentVariable("OPENAI_API_KEY")!;
OpenAIResponseClient client = new(model: "gpt-5", apiKey: key);

OpenAIResponse response = client.CreateResponse(
    "Write a one-sentence bedtime story about a unicorn."
);

Console.WriteLine(response.GetOutputText());
```

```bash
curl "https://api.openai.com/v1/responses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-5",
        "input": "Write a one-sentence bedtime story about a unicorn."
    }'
```

An array of content generated by the model is in the `output` property of the response. In this simple example, we have just one output which looks like this:

```json
[
  {
    "id": "msg_67b73f697ba4819183a15cc17d011509",
    "type": "message",
    "role": "assistant",
    "content": [
      {
        "type": "output_text",
        "text": "Under the soft glow of the moon, Luna the unicorn danced through fields of twinkling stardust, leaving trails of dreams for every child asleep.",
        "annotations": []
      }
    ]
  }
]
```

**The `output` array often has more than one item in it!** It can contain tool calls, data about reasoning tokens generated by [reasoning models](/docs/guides/reasoning), and other items. It is not safe to assume that the model's text output is present at `output[0].content[0].text`.

Some of our [official SDKs](/docs/libraries) include an `output_text` property on model responses for convenience, which aggregates all text outputs from the model into a single string. This may be useful as a shortcut to access text output from the model.

In addition to plain text, you can also have the model return structured data in JSON format—this feature is called [**Structured Outputs**](/docs/guides/structured-outputs).

## Prompt engineering

**Prompt engineering** is the process of writing effective instructions for a model, such that it consistently generates content that meets your requirements.

Because the content generated from a model is non-deterministic, prompting to get your desired output is a mix of art and science. However, you can apply techniques and best practices to get good results consistently.

Some prompt engineering techniques work with every model, like using message roles. But different models might need to be prompted differently to produce the best results. Even different snapshots of models within the same family could produce different results. So as you build more complex applications, we strongly recommend:

- Pinning your production applications to specific [model snapshots](/docs/models) (like `gpt-5-2025-08-07` for example) to ensure consistent behavior
- Building [evals](/docs/guides/evals) that measure the behavior of your prompts so you can monitor prompt performance as you iterate, or when you change and upgrade model versions

Now, let's examine some tools and techniques available to you to construct prompts.

## Choosing models and APIs

OpenAI has many different [models](/docs/models) and several APIs to choose from. [Reasoning models](/docs/guides/reasoning), like o3 and GPT-5, behave differently from chat models and respond better to different prompts. One important note is that reasoning models perform better and demonstrate higher intelligence when used with the Responses API.

If you're building any text generation app, we recommend using the Responses API over the older Chat Completions API. And if you're using a reasoning model, it's especially useful to [migrate to Responses](/docs/guides/migrate-to-responses).

## Message roles and instruction following

You can provide instructions to the model with [differing levels of authority](https://model-spec.openai.com/2025-02-12.html#chain_of_command) using the `instructions` API parameter along with **message roles**.

The `instructions` parameter gives the model high-level instructions on how it should behave while generating a response, including tone, goals, and examples of correct responses. Any instructions provided this way will take priority over a prompt in the `input` parameter.

Generate text with instructions

```javascript
import OpenAI from 'openai'
const client = new OpenAI()

const response = await client.responses.create({
  model: 'gpt-5',
  reasoning: { effort: 'low' },
  instructions: 'Talk like a pirate.',
  input: 'Are semicolons optional in JavaScript?',
})

console.log(response.output_text)
```

```python
from openai import OpenAI
client = OpenAI()

response = client.responses.create(
    model="gpt-5",
    reasoning={"effort": "low"},
    instructions="Talk like a pirate.",
    input="Are semicolons optional in JavaScript?",
)

print(response.output_text)
```

```bash
curl "https://api.openai.com/v1/responses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-5",
        "reasoning": {"effort": "low"},
        "instructions": "Talk like a pirate.",
        "input": "Are semicolons optional in JavaScript?"
    }'
```

The example above is roughly equivalent to using the following input messages in the `input` array:

Generate text with messages using different roles

```javascript
import OpenAI from 'openai'
const client = new OpenAI()

const response = await client.responses.create({
  model: 'gpt-5',
  reasoning: { effort: 'low' },
  input: [
    {
      role: 'developer',
      content: 'Talk like a pirate.',
    },
    {
      role: 'user',
      content: 'Are semicolons optional in JavaScript?',
    },
  ],
})

console.log(response.output_text)
```

```python
from openai import OpenAI
client = OpenAI()

response = client.responses.create(
    model="gpt-5",
    reasoning={"effort": "low"},
    input=[
        {
            "role": "developer",
            "content": "Talk like a pirate."
        },
        {
            "role": "user",
            "content": "Are semicolons optional in JavaScript?"
        }
    ]
)

print(response.output_text)
```

```bash
curl "https://api.openai.com/v1/responses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-5",
        "reasoning": {"effort": "low"},
        "input": [
            {
                "role": "developer",
                "content": "Talk like a pirate."
            },
            {
                "role": "user",
                "content": "Are semicolons optional in JavaScript?"
            }
        ]
    }'
```

Note that the `instructions` parameter only applies to the current response generation request. If you are [managing conversation state](/docs/guides/conversation-state) with the `previous_response_id` parameter, the `instructions` used on previous turns will not be present in the context.

The [OpenAI model spec](https://model-spec.openai.com/2025-02-12.html#chain_of_command) describes how our models give different levels of priority to messages with different roles.

| developer                                                                                                      | user                                                                                           | assistant                                                |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| developer messages are instructions provided by the application developer, prioritized ahead of user messages. | user messages are instructions provided by an end user, prioritized behind developer messages. | Messages generated by the model have the assistant role. |

A multi-turn conversation may consist of several messages of these types, along with other content types provided by both you and the model. Learn more about [managing conversation state here](/docs/guides/conversation-state).

You could think about `developer` and `user` messages like a function and its arguments in a programming language.

- `developer` messages provide the system's rules and business logic, like a function definition.
- `user` messages provide inputs and configuration to which the `developer` message instructions are applied, like arguments to a function.

## Reusable prompts

In the OpenAI dashboard, you can develop reusable [prompts](/chat/edit) that you can use in API requests, rather than specifying the content of prompts in code. This way, you can more easily build and evaluate your prompts, and deploy improved versions of your prompts without changing your integration code.

Here's how it works:

1.  **Create a reusable prompt** in the [dashboard](/chat/edit) with placeholders like `{{customer_name}}`.
2.  **Use the prompt** in your API request with the `prompt` parameter. The prompt parameter object has three properties you can configure:
    - `id` — Unique identifier of your prompt, found in the dashboard
    - `version` — A specific version of your prompt (defaults to the "current" version as specified in the dashboard)
    - `variables` — A map of values to substitute in for variables in your prompt. The substitution values can either be strings, or other Response input message types like `input_image` or `input_file`. [See the full API reference](/docs/api-reference/responses/create).

String variables

Generate text with a prompt template

```javascript
import OpenAI from 'openai'
const client = new OpenAI()

const response = await client.responses.create({
  model: 'gpt-5',
  prompt: {
    id: 'pmpt_abc123',
    version: '2',
    variables: {
      customer_name: 'Jane Doe',
      product: '40oz juice box',
    },
  },
})

console.log(response.output_text)
```

```python
from openai import OpenAI
client = OpenAI()

response = client.responses.create(
    model="gpt-5",
    prompt={
        "id": "pmpt_abc123",
        "version": "2",
        "variables": {
            "customer_name": "Jane Doe",
            "product": "40oz juice box"
        }
    }
)

print(response.output_text)
```

```bash
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5",
    "prompt": {
      "id": "pmpt_abc123",
      "version": "2",
      "variables": {
        "customer_name": "Jane Doe",
        "product": "40oz juice box"
      }
    }
  }'
```

Variables with file input

Prompt template with file input variable

```javascript
import fs from 'fs'
import OpenAI from 'openai'
const client = new OpenAI()

// Upload a PDF we will reference in the prompt variables
const file = await client.files.create({
  file: fs.createReadStream('draconomicon.pdf'),
  purpose: 'user_data',
})

const response = await client.responses.create({
  model: 'gpt-5',
  prompt: {
    id: 'pmpt_abc123',
    variables: {
      topic: 'Dragons',
      reference_pdf: {
        type: 'input_file',
        file_id: file.id,
      },
    },
  },
})

console.log(response.output_text)
```

```python
import openai, pathlib

client = openai.OpenAI()

# Upload a PDF we will reference in the variables
file = client.files.create(
    file=open("draconomicon.pdf", "rb"),
    purpose="user_data",
)

response = client.responses.create(
    model="gpt-5",
    prompt={
        "id": "pmpt_abc123",
        "variables": {
            "topic": "Dragons",
            "reference_pdf": {
                "type": "input_file",
                "file_id": file.id,
            },
        },
    },
)

print(response.output_text)
```

```bash
# Assume you have already uploaded the PDF and obtained FILE_ID
curl https://api.openai.com/v1/responses   -H "Authorization: Bearer $OPENAI_API_KEY"   -H "Content-Type: application/json"   -d '{
    "model": "gpt-5",
    "prompt": {
      "id": "pmpt_abc123",
      "variables": {
        "topic": "Dragons",
        "reference_pdf": {
          "type": "input_file",
          "file_id": "file-abc123"
        }
      }
    }
  }'
```

## Next steps

Now that you known the basics of text inputs and outputs, you might want to check out one of these resources next.

[

Build a prompt in the Playground

Use the Playground to develop and iterate on prompts.

](/chat/edit)[

Generate JSON data with Structured Outputs

Ensure JSON data emitted from a model conforms to a JSON schema.

](/docs/guides/structured-outputs)[

Full API reference

Check out all the options for text generation in the API reference.

](/docs/api-reference/responses)

# Graders

Learn about graders used for evals and fine-tuning.

Graders are a way to evaluate your model's performance against reference answers. Our [graders API](/docs/api-reference/graders) is a way to test your graders, experiment with results, and improve your fine-tuning or evaluation framework to get the results you want.

## Overview

Graders let you compare reference answers to the corresponding model-generated answer and return a grade in the range from 0 to 1. It's sometimes helpful to give the model partial credit for an answer, rather than a binary 0 or 1.

Graders are specified in JSON format, and there are several types:

- [String check](/docs/guides/graders#string-check-graders)
- [Text similarity](/docs/guides/graders#text-similarity-graders)
- [Score model grader](/docs/guides/graders#score-model-graders)
- [Label model grader](/docs/guides/graders#label-model-graders)
- [Python code execution](/docs/guides/graders#python-graders)

In reinforcement fine-tuning, you can nest and combine graders by using [multigraders](/docs/guides/graders#multigraders).

Use this guide to learn about each grader type and see starter examples. To build a grader and get started with reinforcement fine-tuning, see the [RFT guide](/docs/guides/reinforcement-fine-tuning). Or to get started with evals, see the [Evals guide](/docs/guides/evals).

## Templating

The inputs to certain graders use a templating syntax to grade multiple examples with the same configuration. Any string with `{{ }}` double curly braces will be substituted with the variable value.

Each input inside the `{{}}` must include a _namespace_ and a _variable_ with the following format `{{ namespace.variable }}`. The only supported namespaces are `item` and `sample`.

All nested variables can be accessed with JSON path like syntax.

### Item namespace

The item namespace will be populated with variables from the input data source for evals, and from each dataset item for fine-tuning. For example, if a row contains the following

```json
{
  "reference_answer": "..."
}
```

This can be used within the grader as `{{ item.reference_answer }}`.

### Sample namespace

The sample namespace will be populated with variables from the model sampling step during evals or during the fine-tuning step. The following variables are included

- `output_text`, the model output content as a string.
- `output_json`, the model output content as a JSON object, only if `response_format` is included in the sample.
- `output_tools`, the model output `tool_calls`, which have the same structure as output tool calls in the [chat completions API](/docs/api-reference/chat/object).
- `choices`, the output choices, which has the same structure as output choices in the [chat completions API](/docs/api-reference/chat/object).
- `output_audio`, the model audio output object containing Base64-encoded `data` and a `transcript`.

For example, to access the model output content as a string, `{{ sample.output_text }}` can be used within the grader.

Details on grading tool calls

When training a model to improve tool-calling behavior, you will need to write your grader to operate over the `sample.output_tools` variable. The contents of this variable will be the same as the contents of the `response.choices[0].message.tool_calls` ([see function calling docs](/docs/guides/function-calling?api-mode=chat)).

A common way of grading tool calls is to use two graders, one that checks the name of the tool that is called and another that checks the arguments of the called function. An example of a grader that does this is shown below:

```json
{
  "type": "multi",
  "graders": {
    "function_name": {
      "name": "function_name",
      "type": "string_check",
      "input": "get_acceptors",
      "reference": "{{sample.output_tools[0].function.name}}",
      "operation": "eq"
    },
    "arguments": {
      "name": "arguments",
      "type": "string_check",
      "input": "{\"smiles\": \"{{item.smiles}}\"}",
      "reference": "{{sample.output_tools[0].function.arguments}}",
      "operation": "eq"
    }
  },
  "calculate_output": "0.5 * function_name + 0.5 * arguments"
}
```

This is a `multi` grader that combined two simple `string_check` graders, the first checks the name of the tool called via the `sample.output_tools[0].function.name` variable, and the second checks the arguments of the called function via the `sample.output_tools[0].function.arguments` variable. The `calculate_output` field is used to combine the two scores into a single score.

The `arguments` grader is prone to under-rewarding the model if the function arguments are subtly incorrect, like if `1` is submitted instead of the floating point `1.0`, or if a state name is given as an abbreviation instead of spelling it out. To avoid this, you can use a `text_similarity` grader instead of a `string_check` grader, or a `score_model` grader to have a LLM check for semantic similarity.

## String check grader

Use these simple string operations to return a 0 or 1. String check graders are good for scoring straightforward pass or fail answers—for example, the correct name of a city, a yes or no answer, or an answer containing or starting with the correct information.

```json
{
    "type": "string_check",
    "name": string,
    "operation": "eq" | "ne" | "like" | "ilike",
    "input": string,
    "reference": string,
}
```

Operations supported for string-check-grader are:

- `eq`: Returns 1 if the input matches the reference (case-sensitive), 0 otherwise
- `neq`: Returns 1 if the input does not match the reference (case-sensitive), 0 otherwise
- `like`: Returns 1 if the input contains the reference (case-sensitive), 0 otherwise
- `ilike`: Returns 1 if the input contains the reference (not case-sensitive), 0 otherwise

## Text similarity grader

Use text similarity graders when to evaluate how close the model-generated output is to the reference, scored with various evaluation frameworks.

This is useful for open-ended text responses. For example, if your dataset contains reference answers from experts in paragraph form, it's helpful to see how close your model-generated answer is to that content, in numerical form.

```json
{
    "type": "text_similarity",
    "name": string,
    "input": string,
    "reference": string,
    "pass_threshold": number,
    "evaluation_metric": "fuzzy_match" | "bleu" | "gleu" | "meteor" | "cosine" | "rouge_1" | "rouge_2" | "rouge_3" | "rouge_4" | "rouge_5" | "rouge_l"
}
```

Operations supported for `string-similarity-grader` are:

- `fuzzy_match`: Fuzzy string match between input and reference, using `rapidfuzz`
- `bleu`: Computes the BLEU score between input and reference
- `gleu`: Computes the Google BLEU score between input and reference
- `meteor`: Computes the METEOR score between input and reference
- `cosine`: Computes Cosine similarity between embedded input and reference, using `text-embedding-3-large`. Only available for evals.
- `rouge-*`: Computes the ROUGE score between input and reference

## Model graders

In general, using a model grader means prompting a separate model to grade the outputs of the model you're fine-tuning. Your two models work together to do reinforcement fine-tuning. The _grader model_ evaluates the _training model_.

A **score model grader** provides and evaluates a numerical score, whereas a **label model grader** provides a classification label.

### Score model graders

A score model grader will take the input and return a score based on the prompt within the given range.

```json
{
    "type": "score_model",
    "name": string,
    "input": Message[],
    "model": string,
    "pass_threshold": number,
    "range": number[],
    "sampling_params": {
        "seed": number,
        "top_p": number,
        "temperature": number,
        "max_completions_tokens": number,
        "reasoning_effort": "minimal" | "low" | "medium" | "high"
    }
}
```

Where each message is of the following form:

```json
{
    "role": "system" | "developer" | "user" | "assistant",
    "content": str
}
```

To use a score model grader, the input is a list of chat messages, each containing a `role` and `content`. The output of the grader will be truncated to the given `range`, and default to 0 for all non-numeric outputs. Within each message, the same templating can be used as with other common graders to reference the ground truth or model sample.

Here’s a full runnable code sample:

```python
import os
import requests

# get the API key from environment
api_key = os.environ["OPENAI_API_KEY"]
headers = {"Authorization": f"Bearer {api_key}"}

# define a dummy grader for illustration purposes
grader = {
   "type": "score_model",
   "name": "my_score_model",
   "input": [
        {
            "role": "system",
            "content": "You are an expert grader. If the reference and model answer are exact matches, output a score of 1. If they are somewhat similar in meaning, output a score in 0.5. Otherwise, give a score of 0."
        },
        {
            "role": "user",
            "content": "Reference: {{ item.reference_answer }}. Model answer: {{ sample.output_text }}"
        }
   ],
   "pass_threshold": 0.5,
   "model": "o4-mini-2025-04-16",
   "range": [0, 1],
   "sampling_params": {
       "max_completions_tokens": 32768,
       "top_p": 1,
       "reasoning_effort": "medium"
   },
}

# validate the grader
payload = {"grader": grader}
response = requests.post(
    "https://api.openai.com/v1/fine_tuning/alpha/graders/validate",
    json=payload,
    headers=headers
)
print("validate response:", response.text)

# run the grader with a test reference and sample
payload = {
  "grader": grader,
  "item": {
     "reference_answer": 1.0
  },
  "model_sample": "0.9"
}
response = requests.post(
    "https://api.openai.com/v1/fine_tuning/alpha/graders/run",
    json=payload,
    headers=headers
)
print("run response:", response.text)
```

#### Score model grader outputs

Under the hood, the `score_model` grader will query the requested model with the provided prompt and sampling parameters and will request a response in a specific response format. The response format that is used is provided below

```json
{
  "result": float,
  "steps": ReasoningStep[],
}
```

Where each reasoning step is of the form

```json
{
    description: string,
    conclusion: string
}
```

This format queries the model not just for the numeric `result` (the reward value for the query), but also provides the model some space to think through the reasoning behind the score. When you are writing your grader prompt, it may be useful to refer to these two fields by name explicitly (e.g. "include reasoning about the type of chemical bonds present in the molecule in the conclusion of your reasoning step", or "return a value of -1.0 in the `result` field if the inputs do not satisfy condition X").

### Label model graders

A label model grader will take the input and a set of passing labels and return a 1 if the model output is within the label set and 0 otherwise.

```json
{
	"type": "label_model",
    "name": string,
	"model": string,
	"input": Message[],
	"passing_labels": string[],
	"labels": string[],
	"sampling_params": {
        "max_completions_tokens": 32768,
        "top_p": 1,
        "reasoning_effort": "medium"
    }
}
```

To use a label model grader, the input is a list of chat messages, each containing a `role` and `content`. The output of the grader will be limited to the given set of labels. Within each message, the same templating can be used as with other common graders to reference the ground truth or model sample.

Here’s a full runnable code sample:

```python
import os
import requests

# get the API key from environment
api_key = os.environ["OPENAI_API_KEY"]
headers = {"Authorization": f"bearer {api_key}"}

# define a dummy grader for illustration purposes
grader = {
   "type": "label_model",
   "name": "my_label_model",
   "input": [
        {
            "role": "system",
            "content": "You are an expert grader."
        },
        {
            "role": "user",
            "content": "Classify this: {{ sample.output_text }} as either good or bad, where closer to 1 is good."
        }
   ],
   "passing_labels": ["good"],
   "labels": ["good", "bad"],
   "model": "o3-mini-2024-01-31",
   "sampling_params": {
       "max_tokens": 32768,
       "top_p": 1,
       "seed": 42,
       "reasoning_effort": "medium"
   },
}

# validate the grader
payload = {"grader": grader}
response = requests.post(
    "https://api.openai.com/v1/fine_tuning/alpha/graders/validate",
    json=payload,
    headers=headers
)
print("validate response:", response.text)

# run the grader with a test reference and sample
payload = {
  "grader": grader,
  "item": {},
  "model_sample": "0.9"
}
response = requests.post(
    "https://api.openai.com/v1/fine_tuning/alpha/graders/run",
    json=payload,
    headers=headers
)
print("run response:", response.text)
```

### Model grader constraints

- Only the following models are supported for the `model` parameter\`
  - `gpt-4o-2024-08-06`
  - `gpt-4o-mini-2024-07-18`
  - `gpt-4.1-2025-04-14`
  - `gpt-4.1-mini-2025-04-14`
  - `gpt-4.1-nano-2025-04-14`
  - `o1-2024-12-17`
  - `o3-mini-2025-01-31`
  - `o3-2025-04-16`
  - `o4-mini-2025-04-16`
- `temperature` changes not supported for reasoning models.
- `reasoning_effort` is not supported for non-reasoning models.

### How to write grader prompts

Writing grader prompts is an iterative process. The best way to iterate on a model grader prompt is to create a model grader eval. To do this, you need:

1.  **Task prompts**: Write extremely detailed prompts for the desired task, with step-by-step instructions and many specific examples in context.
2.  **Answers generated by a model or human expert**: Provide many high quality examples of answers, both from the model and trusted human experts.
3.  **Corresponding ground truth grades for those answers**: Establish what a good grade looks like. For example, your human expert grades should be 1.

Then you can automatically evaluate how effectively the model grader distinguishes answers of different quality levels. Over time, add edge cases into your model grader eval as you discover and patch them with changes to the prompt.

For example, say you know from your human experts which answers are best:

```text
answer_1 > answer_2 > answer_3
```

Verify that the model grader's answers match that:

```text
model_grader(answer_1, reference_answer) > model_grader(answer_2, reference_answer) > model_grader(answer_3, reference_answer)
```

### Grader hacking

Models being trained sometimes learn to exploit weaknesses in model graders, also known as “grader hacking” or “reward hacking." You can detect this by checking the model's performance across model grader evals and expert human evals. A model that's hacked the grader will score highly on model grader evals but score poorly on expert human evaluations. Over time, we intend to improve observability in the API to make it easier to detect this during training.

## Python graders

This grader allows you to execute arbitrary python code to grade the model output. The grader expects a grade function to be present that takes in two arguments and outputs a float value. Any other result (exception, invalid float value, etc.) will be marked as invalid and return a 0 grade.

```json
{
  "type": "python",
  "source": "def grade(sample, item):\n    return 1.0",
  "image_tag": "2025-05-08"
}
```

The python source code must contain a grade function that takes in exactly two arguments and returns a float value as a grade.

```python
from typing import Any

def grade(sample: dict[str, Any], item: dict[str, Any]) -> float:
    # your logic here
    return 1.0
```

The first argument supplied to the grading function will be a dictionary populated with the model’s output during training for you to grade. `output_json` will only be populated if the output uses `response_format`.

```json
{
    "choices": [...],
    "output_text": "...",
    "output_json": {},
    "output_tools": [...],
    "output_audio": {}
}
```

The second argument supplied is a dictionary populated with input grading context. For evals, this will include keys from the data source. For fine-tuning this will include keys from each training data row.

```json
{
    "reference_answer": "...",
    "my_key": {...}
}
```

Here's a working example:

```python
import os
import requests

# get the API key from environment
api_key = os.environ["OPENAI_API_KEY"]
headers = {"Authorization": f"Bearer {api_key}"}

grading_function = """
from rapidfuzz import fuzz, utils

def grade(sample, item) -> float:
    output_text = sample["output_text"]
    reference_answer = item["reference_answer"]
    return fuzz.WRatio(output_text, reference_answer, processor=utils.default_process) / 100.0
"""

# define a dummy grader for illustration purposes
grader = {
    "type": "python",
    "source": grading_function
}

# validate the grader
payload = {"grader": grader}
response = requests.post(
    "https://api.openai.com/v1/fine_tuning/alpha/graders/validate",
    json=payload,
    headers=headers
)
print("validate request_id:", response.headers["x-request-id"])
print("validate response:", response.text)

# run the grader with a test reference and sample
payload = {
  "grader": grader,
  "item": {
     "reference_answer": "fuzzy wuzzy had no hair"
  },
  "model_sample": "fuzzy wuzzy was a bear"
}
response = requests.post(
    "https://api.openai.com/v1/fine_tuning/alpha/graders/run",
    json=payload,
    headers=headers
)
print("run request_id:", response.headers["x-request-id"])
print("run response:", response.text)
```

**Tip:**  
If you don't want to manually put your grading function in a string, you can also load it from a Python file using `importlib` and `inspect`. For example, if your grader function is in a file named `grader.py`, you can do:

```python
import importlib
import inspect

grader_module = importlib.import_module("grader")
grader = {
    "type": "python",
    "source": inspect.getsource(grader_module)
}
```

This will automatically use the entire source code of your `grader.py` file as the grader which can be helpful for longer graders.

### Technical constraints

- Your uploaded code must be less than `256kB` and will not have network access.
- The grading execution itself is limited to 2 minutes.
- At runtime you will be given a limit of 2Gb of memory and 1Gb of disk space to use.
- There's a limit of 2 CPU cores—any usage above this amount will result in throttling

The following third-party packages are available at execution time for the image tag `2025-05-08`

```text
numpy==2.2.4
scipy==1.15.2
sympy==1.13.3
pandas==2.2.3
rapidfuzz==3.10.1
scikit-learn==1.6.1
rouge-score==0.1.2
deepdiff==8.4.2
jsonschema==4.23.0
pydantic==2.10.6
pyyaml==6.0.2
nltk==3.9.1
sqlparse==0.5.3
rdkit==2024.9.6
scikit-bio==0.6.3
ast-grep-py==0.36.2
```

Additionally the following nltk corpora are available:

```text
punkt
stopwords
wordnet
omw-1.4
names
```

## Multigraders

> Currently, this grader is only used for Reinforcement fine-tuning

A `multigrader` object combines the output of multiple graders to produce a single score. Multigraders work by computing grades over the fields of other grader objects and turning those sub-grades into an overall grade. This is useful when a correct answer depends on multiple things being true—for example, that the text is similar _and_ that the answer contains a specific string.

As an example, say you wanted the model to output JSON with the following two fields:

```json
{
  "name": "John Doe",
  "email": "john.doe@gmail.com"
}
```

You'd want your grader to compare the two fields and then take the average between them.

You can do this by combining multiple graders into an object grader, and then defining a formula to calculate the output score based on each field:

```json
{
  "type": "multi",
  "graders": {
    "name": {
      "name": "name_grader",
      "type": "text_similarity",
      "input": "{{sample.output_json.name}}",
      "reference": "{{item.name}}",
      "evaluation_metric": "fuzzy_match",
      "pass_threshold": 0.9
    },
    "email": {
      "name": "email_grader",
      "type": "string_check",
      "input": "{{sample.output_json.email}}",
      "reference": "{{item.email}}",
      "operation": "eq"
    }
  },
  "calculate_output": "(name + email) / 2"
}
```

In this example, it’s important for the model to get the email exactly right (`string_check` returns either 0 or 1) but we tolerate some misspellings on the name (`text_similarity` returns range from 0 to 1). Samples that get the email wrong will score between 0-0.5, and samples that get the email right will score between 0.5-1.0.

You cannot create a multigrader with a nested multigrader inside.

The calculate output field will have the keys of the input `graders` as possible variables and the following features are supported:

**Operators**

- `+` (addition)
- `-` (subtraction)
- `*` (multiplication)
- `/` (division)
- `^` (power)

**Functions**

- `min`
- `max`
- `abs`
- `floor`
- `ceil`
- `exp`
- `sqrt`
- `log`

## Limitations and tips

Designing and creating graders is an iterative process. Start small, experiment, and continue to make changes to get better results.

### Design tips

To get the most value from your graders, use these design principles:

- **Produce a smooth score, not a pass/fail stamp**. A score that shifts gradually as answers improve helps the optimizer see which changes matter.
- **Guard against reward hacking**. This happens when the model finds a shortcut that earns high scores without real skill. Make it hard to loophole your grading system.
- **Avoid skewed data**. Datasets in which one label shows up most of the time invite the model to guess that label. Balance the set or up‑weight rare cases so the model must think.
- **Use an LLM‑as‑a-judge when code falls short**. For rich, open‑ended answers, ask another language model to grade. When building LLM graders, run multiple candidate responses and ground truths through your LLM judge to ensure grading is stable and aligned with preference. Provide few-shot examples of great, fair, and poor answers in the prompt.

Upload file
post https://api.openai.com/v1/files

Upload a file that can be used across various endpoints. Individual files can be up to 512 MB, and the size of all files uploaded by one organization can be up to 1 TB.

The Assistants API supports files up to 2 million tokens and of specific file types. See the Assistants Tools guide for details.

The Fine-tuning API only supports .jsonl files. The input also has certain required formats for fine-tuning chat or completions models.

The Batch API only supports .jsonl files up to 200 MB in size. The input also has a specific required format.

Please contact us if you need to increase these storage limits.
Request body
file

file
Required

The File object (not file name) to be uploaded.
purpose

string
Required

The intended purpose of the uploaded file. One of: - assistants: Used in the Assistants API - batch: Used in the Batch API - fine-tune: Used for fine-tuning - vision: Images used for vision fine-tuning - user_data: Flexible file type for any purpose - evals: Used for eval data sets
expires_after

object
Optional

The expiration policy for a file. By default, files with purpose=batch expire after 30 days and all other files are persisted until they are manually deleted.
Returns

The uploaded File object.
Example request

curl https://api.openai.com/v1/files \
 -H "Authorization: Bearer $OPENAI_API_KEY" \
 -F purpose="fine-tune" \
 -F file="@mydata.jsonl"
-F expires_after[anchor]="created_at"
-F expires_after[seconds]=2592000

Response

{
"id": "file-abc123",
"object": "file",
"bytes": 120000,
"created_at": 1677610602,
"expires_at": 1677614202,
"filename": "mydata.jsonl",
"purpose": "fine-tune",
}

# Webhooks

Use webhooks to receive real-time updates from the OpenAI API.

OpenAI [webhooks](http://chatgpt.com/?q=eli5+what+is+a+webhook?) allow you to receive real-time notifications about events in the API, such as when a batch completes, a background response is generated, or a fine-tuning job finishes. Webhooks are delivered to an HTTP endpoint you control, following the [Standard Webhooks specification](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md). The full list of webhook events can be found in the [API reference](/docs/api-reference/webhook-events).

[

API reference for webhook events

View the full list of webhook events.

](/docs/api-reference/webhook-events)

Below are examples of simple servers capable of ingesting webhooks from OpenAI, specifically for the [`response.completed`](/docs/api-reference/webhook-events/response/completed) event.

Webhooks server

```python
import os
from openai import OpenAI, InvalidWebhookSignatureError
from flask import Flask, request, Response

app = Flask(__name__)
client = OpenAI(webhook_secret=os.environ["OPENAI_WEBHOOK_SECRET"])

@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        # with webhook_secret set above, unwrap will raise an error if the signature is invalid
        event = client.webhooks.unwrap(request.data, request.headers)

        if event.type == "response.completed":
            response_id = event.data.id
            response = client.responses.retrieve(response_id)
            print("Response output:", response.output_text)

        return Response(status=200)
    except InvalidWebhookSignatureError as e:
        print("Invalid signature", e)
        return Response("Invalid signature", status=400)

if __name__ == "__main__":
    app.run(port=8000)
```

```javascript
import OpenAI from 'openai'
import express from 'express'

const app = express()
const client = new OpenAI({ webhookSecret: process.env.OPENAI_WEBHOOK_SECRET })

// Don't use express.json() because signature verification needs the raw text body
app.use(express.text({ type: 'application/json' }))

app.post('/webhook', async (req, res) => {
  try {
    const event = await client.webhooks.unwrap(req.body, req.headers)

    if (event.type === 'response.completed') {
      const response_id = event.data.id
      const response = await client.responses.retrieve(response_id)
      const output_text = response.output
        .filter((item) => item.type === 'message')
        .flatMap((item) => item.content)
        .filter((contentItem) => contentItem.type === 'output_text')
        .map((contentItem) => contentItem.text)
        .join('')

      console.log('Response output:', output_text)
    }
    res.status(200).send()
  } catch (error) {
    if (error instanceof OpenAI.InvalidWebhookSignatureError) {
      console.error('Invalid signature', error)
      res.status(400).send('Invalid signature')
    } else {
      throw error
    }
  }
})

app.listen(8000, () => {
  console.log('Webhook server is running on port 8000')
})
```

To see a webhook like this one in action, you can set up a webhook endpoint in the OpenAI dashboard subscribed to `response.completed`, and then make an API request to [generate a response in background mode](/docs/guides/background).

You can also trigger test events with sample data from the [webhook settings page](/settings/project/webhooks).

Generate a background response

```bash
curl https://api.openai.com/v1/responses \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-d '{
  "model": "o3",
  "input": "Write a very long novel about otters in space.",
  "background": true
}'
```

```javascript
import OpenAI from 'openai'
const client = new OpenAI()

const resp = await client.responses.create({
  model: 'o3',
  input: 'Write a very long novel about otters in space.',
  background: true,
})

console.log(resp.status)
```

```python
from openai import OpenAI

client = OpenAI()

resp = client.responses.create(
  model="o3",
  input="Write a very long novel about otters in space.",
  background=True,
)

print(resp.status)
```

In this guide, you will learn how to create webook endpoints in the dashboard, set up server-side code to handle them, and verify that inbound requests originated from OpenAI.

## Creating webhook endpoints

To start receiving webhook requests on your server, log in to the dashboard and [open the webhook settings page](/settings/project/webhooks). Webhooks are configured per-project.

Click the "Create" button to create a new webhook endpoint. You will configure three things:

- A name for the endpoint (just for your reference).
- A public URL to a server you control.
- One or more event types to subscribe to. When they occur, OpenAI will send an HTTP POST request to the URL specified.

![webhook endpoint edit dialog](https://cdn.openai.com/API/images/webhook_config.png)

After creating a new webhook, you'll receive a signing secret to use for server-side verification of incoming webhook requests. Save this value for later, since you won't be able to view it again.

With your webhook endpoint created, you'll next set up a server-side endpoint to handle those incoming event payloads.

## Handling webhook requests on a server

When an event happens that you're subscribed to, your webhook URL will receive an HTTP POST request like this:

```text
POST https://yourserver.com/webhook
user-agent: OpenAI/1.0 (+https://platform.openai.com/docs/webhooks)
content-type: application/json
webhook-id: wh_685342e6c53c8190a1be43f081506c52
webhook-timestamp: 1750287078
webhook-signature: v1,K5oZfzN95Z9UVu1EsfQmfVNQhnkZ2pj9o9NDN/H/pI4=
{
  "object": "event",
  "id": "evt_685343a1381c819085d44c354e1b330e",
  "type": "response.completed",
  "created_at": 1750287018,
  "data": { "id": "resp_abc123" }
}
```

Your endpoint should respond quickly to these incoming HTTP requests with a successful (`2xx`) status code, indicating successful receipt. To avoid timeouts, we recommend offloading any non-trivial processing to a background worker so that the endpoint can respond immediately. If the endpoint doesn't return a successful (`2xx`) status code, or doesn't respond within a few seconds, the webhook request will be retried. OpenAI will continue to attempt delivery for up to 72 hours with exponential backoff. Note that `3xx` redirects will not be followed; they are treated as failures and your endpoint should be updated to use the final destination URL.

In rare cases, due to internal system issues, OpenAI may deliver duplicate copies of the same webhook event. You can use the `webhook-id` header as an idempotency key to deduplicate.

### Testing webhooks locally

Testing webhooks requires a URL that is available on the public Internet. This can make development tricky, since your local development environment likely isn't open to the public. A few options that may help:

- [ngrok](https://ngrok.com/) which can expose your localhost server on a public URL
- Cloud development environments like [Replit](https://replit.com/), [GitHub Codespaces](https://github.com/features/codespaces), [Cloudflare Workers](https://workers.cloudflare.com/), or [v0 from Vercel](https://v0.dev/).

## Verifying webhook signatures

While you can receive webhook events from OpenAI and process the results without any verification, you should verify that incoming requests are coming from OpenAI, especially if your webhook will take any kind of action on the backend. The headers sent along with webhook requests contain information that can be used in combination with a webhook secret key to verify that the webhook originated from OpenAI.

When you create a webhook endpoint in the OpenAI dashboard, you'll be given a signing secret that you should make available on your server as an environment variable:

```text
export OPENAI_WEBHOOK_SECRET="<your secret here>"
```

The simplest way to verify webhook signatures is by using the `unwrap()` method of the official OpenAI SDK helpers:

Signature verification with the OpenAI SDK

```python
client = OpenAI()
webhook_secret = os.environ["OPENAI_WEBHOOK_SECRET"]

# will raise if the signature is invalid
event = client.webhooks.unwrap(request.data, request.headers, secret=webhook_secret)
```

```javascript
const client = new OpenAI()
const webhook_secret = process.env.OPENAI_WEBHOOK_SECRET

// will throw if the signature is invalid
const event = client.webhooks.unwrap(req.body, req.headers, {
  secret: webhook_secret,
})
```

Signatures can also be verified with the [Standard Webhooks libraries](https://github.com/standard-webhooks/standard-webhooks/tree/main?tab=readme-ov-file#reference-implementations):

Signature verification with Standard Webhooks libraries

```rust
use standardwebhooks::Webhook;

let webhook_secret = std::env::var("OPENAI_WEBHOOK_SECRET").expect("OPENAI_WEBHOOK_SECRET not set");
let wh = Webhook::new(webhook_secret);
wh.verify(webhook_payload, webhook_headers).expect("Webhook verification failed");
```

```php
$webhook_secret = getenv("OPENAI_WEBHOOK_SECRET");
$wh = new \StandardWebhooks\Webhook($webhook_secret);
$wh->verify($webhook_payload, $webhook_headers);
```

Alternatively, if needed, you can implement your own signature verification [as described in the Standard Webhooks spec](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md#verifying-webhook-authenticity)

If you misplace or accidentally expose your signing secret, you can generate a new one by [rotating the signing secret](/settings/project/webhooks).
