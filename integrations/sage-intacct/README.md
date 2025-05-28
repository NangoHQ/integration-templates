# Sage Intacct Integration

This directory contains the custom **Nango** integration for Sage Intacct. Below you will find concise instructions for interacting directly with the Sage Intacct XML Web-Services API and for importing the official Postman collection for experimentation.

---

## 🔑 How Session Management Works

Nango completes the OAuth2 flow for Sage Intacct and stores an **access token** (JWT). That JWT already contains the `sessionId`. Inside our action we simply:

```ts
const connection = await nango.getConnection();
const jwt = (connection.credentials as OAuth2Credentials).access_token;
const { sessionId } = decodeJwtPayload(jwt);
```

No separate `getAPISession` request is required in your integration code.  
You **only** need to ensure that the connection configuration contains `sender_id` and `sender_password`—the action pulls those values from `connection.connection_config` when sending subsequent XML requests.

### When would I call `getAPISession` myself?

If you are experimenting in Postman or debugging with raw XML, you might still want to obtain a fresh session manually. A standalone `getAPISession` request (never mixed with other functions) looks like this ([docs](https://developer.intacct.com/web-services/your-first-api-calls/#get-an-api-session)):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<request>
    <control>
        <senderid>{{SENDER_ID}}</senderid>
        <password>{{SENDER_PASSWORD}}</password>
        <controlid>{{TIMESTAMP}}</controlid>
        <uniqueid>false</uniqueid>
        <dtdversion>3.0</dtdversion>
        <includewhitespace>false</includewhitespace>
    </control>
    <operation>
        <authentication>
            <login>
                <userid>{{USER_ID}}</userid>
                <companyid>{{COMPANY_ID}}</companyid>
                <password>{{USER_PASSWORD}}</password>
            </login>
        </authentication>
        <content>
            <function controlid="func_{{TIMESTAMP}}">
                <getAPISession/>
            </function>
        </content>
    </operation>
</request>
```

Use the returned `<sessionid>` in the `<authentication>` section of subsequent calls if you choose to test outside of Nango.

---

## 📦 collection Import (Postman)

Sage Intacct publishes an official Postman collection that contains ready-to-run examples for all common API operations.

* **Download:** [Intacct_API_Postman_Collection.zip](https://developer.intacct.com/downloads/Intacct_API_Postman_Collection.zip)
* **Docs:** <https://developer.intacct.com/web-services/your-first-api-calls/#get-an-api-session>

---

## Running the Nango action locally

For additional reference see the [Sage Intacct Developer Guide](https://developer.intacct.com/) and the **Nango** [integration development docs](https://docs.nango.dev).
