Square Webhooks

Learn about Square webhooks, which let developers receive real-time notifications of events, such as inventory changes and Point of Sale payments.
Overview

A webhook is a subscription that registers a notification URL and a list of event types
to be notified about. When an event occurs, Square collects data about the event, creates an event notification, and sends it to the notification URL for all webhook subscriptions that are subscribed to that event. Your application must respond with a 2xx status code as soon as possible to acknowledge that the notification was received.

Events can originate from the Square Dashboard, a Point of Sale (POS) application, other Square products, and third-party applications calling Square APIs. For each event occurrence, Square sends a POST request to your notification URL with the event details in JSON format.

You can use webhooks to trigger additional events when an event occurs and integrate with external systems. For example:

    Send email notifications when an event occurs, such as:
        A refund is more than a certain limit.
        The inventory for an item is getting too low.
        A high-value item was sold.
    Pass data to another system after an event, such as sending customer data to a CRM.
    Connect a third-party POS system to a Square Terminal.
    Trigger other applications to respond to an event.

Did you know?

Webhooks can be sent more than once. You can bypass the processing of repeated notifications using the idempotency value included as the event_id field in the body of each event notification.
Requirements and limitations

Before you start:

    Define a notification URL that points to your application - This is an endpoint that directs webhook event notifications to your application.
    Determine the Square API version - The API version you select must include the webhook events that you want to subscribe to.
    Determine the Square API events that you want to subscribe to - This is the set of webhook events
    that trigger an event notification for your application.

Applications need at least one reachable notification URL to receive and process webhook events from Square. The notification URL endpoint must:

    Require a connection that uses HTTPS.

    Expect JSON data from a POST request.

    Respond to Square with a 2xx HTTP status code as soon as possible to acknowledge the successful receipt of the event notification. If your application fails to acknowledge the notification in a timely manner, a duplicate event is sent and your application has 10 seconds to respond.

    Notification URLs are specified on the Webhook subscriptions page for your application in the Developer Console
    or using the Webhook Subscriptions API
    .

Square provides the following SLA for webhook event notifications:

    In most cases, event notifications arrive in well under 60 seconds of the associated event.
    There's no guarantee of the delivery order of event notices.

Static IP address

Webhooks from Square originate from the following IP addresses. These are provided so you can allow access by these addresses through a firewall you're using.

Production IP addresses:

    54.245.1.154
    34.202.99.168

Sandbox IP addresses:

    54.212.177.79
    107.20.218.8

Notification retries

If a response with a 2xx HTTP status code isn't received in a timely manner or if any other status code is returned, Square assumes that the delivery is unsuccessful and starts retry attempts. Square resends the event notification for up to 24 hours after the originating event, using exponential backoff to avoid spamming applications. After 24 hours, the notification is discarded and no further retry attempts are made.

The retry schedule is as follows:
Retry attempt Time since last attempt Time since event
1 1 minute 1 minute
2 2 minutes 3 minutes
3 4 minutes 7 minutes
4 8 minutes 15 minutes
5 16 minutes 31 minutes
6 32 minutes 63 minutes
7 60 minutes 2 hours
8 2 hours 4 hours
9 4 hours 8 hours
10 8 hours 16 hours
11 8 hours 24 hours

For example, if a 2xx status code isn't received in a timely manner after the initial event notification, Square resends the notification after 1 minute (retry attempt 1). If a 2xx status code isn't received in a timely manner, Square resends the notification after 2 minutes (retry attempt 2). Retried notifications include the square-retry-number and square-retry-reason headers. For more information, see Format of an event notification
.
Did you know?

Applications can use the Events API
to recover and reconcile missed event notifications.
APIs not supporting webhooks

The following Square APIs don't support webhooks:

    Snippets API
    Sites API
    Merchants API
    Cash Drawer Shifts API
    Mobile Authorization API
    Customer Groups API
    Customer Segments API
    Apple Pay API

Orders API

Events on an Order
object can be triggered by your Orders API call or by a seller's action on an order within a Square product such as the Square Point of Sale.
Event Permission Description
order.created
ORDERS_READ An Order
was created. This event is triggered when an order is created by a Square product or your application.
order.fulfillment.updated
ORDERS_READ An OrderFulfillment
was created or updated. This event is triggered when a Square product updates an order fulfillment or when a fulfillment is updated by an UpdateOrder
endpoint call.
order.updated
ORDERS_READ An Order
was updated. This event is triggered only by the UpdateOrder
endpoint call or when a seller updates an order using a Square product.

Format of an event notification

The event notification that's sent to your notification URL includes the following metadata headers:

    x-square-hmacsha256-signature - An HMAC-SHA256 signature used to validate the event authenticity.
    square-environment - The Square account environment that generated the webhook event. The value can be Production or Sandbox.
    square-initial-delivery-timestamp - The time of the initial notification delivery, as an RFC 3339
    timestamp.
    square-retry-number - The number of times Square has resent a notification for the given event (including the current retry) as an integer. The retry number doesn't include the original notification and is only present when there has been at least one unsuccessful delivery.
    square-retry-reason - The reason why the last notification delivery failed. The retry reason is only present when there's at least one unsuccessful delivery and has the following possible values:
        http_timeout - The client server took longer than 10 seconds to respond.
        http_error - The client server responded with a non-2xx status code.
        ssl_error - Square couldn't verify the client's SSL certificate.
        other_error - An unexpected error occurred.

The following screenshot shows headers from an event notification displayed on webhook.site:

A screenshot showing headers for a webhook event notification displayed on webhook.site.

The body of the event notification has a common structure, in JSON format:

    merchant_id - The ID of the merchant account (merchant token) where the event occurred.
    location_id - (optional) The ID of the location or UnitToken associated with the event. The ID is included only if an event is tied to a unit or location for a merchant.
    type - The type of event this notice represents.
    event_id - The idempotency (UUID) value that uniquely identifies the event.
    created_at - The time when the event notification was created, as an RFC 3339 timestamp.
    data - The data associated with the event:
        type - The name of the affected object's type.
        id - The ID of the affected object.
        deleted - A Boolean value set to true if the affected object was deleted. This field is included only when an object is deleted.
        object - The affected object at the time the event was triggered (for example, the updated Customer object for a customer.updated event). This field might not be included for .deleted events. Check the webhook documentation
        for the specific event.

The following is an example of an event notification body:

{
"merchant_id": "{MERCHANT_ID}",
"type": "customer.created",
"event_id": "edce24d3-bf56-46b4-b5ea-40266mnaa5a84",
"created_at": "2021-05-17T22:46:29Z",
"data": {
"type": "customer",
"id": "{CUSTOMER_ID}",
"object": {
"customer": {
"created_at": "2021-05-17T22:46:28.856Z",
"creation_source": "THIRD_PARTY",
"email_address": "customer@mysite.com",
"family_name": "Customer",
"given_name": "MyFirst",
"id": "{CUSTOMER_ID}",
"preferences": {
