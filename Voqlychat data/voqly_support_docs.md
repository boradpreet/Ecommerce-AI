# Voqly AI Official Support Knowledge Base & User Guide

Voqly AI (formerly Ringg AI) is an enterprise conversational AI voice calling platform allowing businesses to build and deploy natural-sounding voice agents in under 2 minutes.

---

## 1. Core Platform Features

### 1.1. Conversational IVR & Smart Routing
Voqly replaces traditional push-button touch-tone phone menus with a conversational voice interface. Callers describe their intent using natural language (e.g., "I need technical support" or "I want to talk to sales"), and the agent routes them instantly. It uses a high-performance semantic parsing engine to categorize intents.

### 1.2. Smart Auto-Dialer Campaigns
Automates outbound lead qualification, reminders, collections, and marketing campaigns. The system automatically places outbound calls sequentially to lists of contacts uploaded to a campaign, using standard concurrency throttling to comply with telephony rate-limiting guidelines.

### 1.3. Web Calling Widgets
Allows users to place click-to-call calls directly from a browser. You can embed the Voqly web calling widget onto any public website using a single snippet of HTML/JS.

### 1.4. CRM & API Integrations
Provides native out-of-the-box integrations with CRM systems like Salesforce and HubSpot, along with developer API keys and customizable webhook triggers for disposition logging.

### 1.5. Telephony Provider Selection (Plivo vs. Twilio)
Outbound agents can dial using either Plivo or Twilio. Administrators can configure a default telephony provider and distinct caller IDs (`plivo_number` and `twilio_number`) at the organization level. This enables seamless regional failovers and custom trunking.

### 1.6. Ultra-Low Latency Speech Engine
With an average response latency of ~110ms, Voqly handles interruptions, speaker barge-ins, and conversation transitions naturally without overlapping or robotic delays.

---

## 2. Subscription Pricing Plans

Voqly AI offers tiered monthly subscription plans based on calling scale:

*   **Free Plan** ($0/month):
    *   1 active AI Voice Agent
    *   1 active phone line / caller ID
    *   100 free call minutes per month
*   **Starter Plan** ($99/month):
    *   2 active AI Voice Agents
    *   1,000 calls per month
    *   Basic analytics
    *   Email support
    *   Twilio SIP integration
    *   5 campaign slots
*   **Growth Plan** ($499/month):
    *   10 active AI Voice Agents
    *   10,000 calls per month
    *   Advanced analytics
    *   Priority support
    *   HubSpot & CRM integrations
    *   Unlimited campaigns
    *   Call recording & transcripts
    *   Webhook support
*   **Professional Plan** ($999/month):
    *   Unlimited active AI Voice Agents
    *   100,000 calls per month
    *   Full analytics suite
    *   Dedicated account manager
    *   All CRM integrations
    *   White-label support
    *   Custom SIP trunking
    *   SLA guarantee
    *   On-prem deployment option
*   **Enterprise Plan** (Custom Pricing):
    *   Custom active AI Voice Agents & lines
    *   Volume usage discounts
    *   Dedicated private cloud infrastructure
    *   24/7 priority support SLA

    *   Unlimited AI Voice Agents
    *   Unlimited phone lines / caller IDs
    *   Volume usage discounts (down to $0.02/min)
    *   Dedicated private cloud infrastructure
    *   24/7 priority support SLA

---

## 3. Step-by-Step User Guides

### 3.1. Guide: How to Create an AI Voice Agent
1.  Navigate to the **AI Agents** tab on the left sidebar of the Voqly dashboard.
2.  Click **Create Agent** or choose an existing agent to edit.
3.  **Step 1 (Identity & Category)**: Specify the agent's name and select a business category vertical (e.g., Ecommerce, Healthcare, Finance, or custom categories).
4.  **Step 2 (Choose Use Case)**: Select the subcategory use case. Shared defaults include *Marketing Campaign*, *Project Overview*, *Gold Loan*, *Credit Card*, or *Booking Agent*. You can request custom subcategories.
5.  **Step 3 (Voice & Language)**:
    *   Choose the **Voice Gender** (Female Voice or Male Voice).
    *   Select the **Language** from the dropdown (options include English, Hindi, Bengali, Gujarati, Kannada, Malayalam, Marathi, Punjabi, Tamil, Telugu).
    *   Select a specific **Vocal Signature Card** (6 options per gender and language).
    *   Click **Play** on any voice signature to listen to a localized sample in the selected language.
    *   Click **Save Agent** to compile and provision the agent.

### 3.2. Guide: How to Setup and Run an Outbound Campaign
1.  Go to the **Campaigns** tab on the sidebar.
2.  Click **Create New Campaign**.
3.  Specify a campaign name, target objective, and link an AI Voice Agent to run the calls.
4.  Select the telephony trunk route (Plivo or Twilio) to be used for the campaign.
5.  Upload the contact database (Leads) using one of the database uploader options.
6.  Configure dial settings (e.g. daily hours, concurrency limits) and click **Start Campaign** to launch the dialer.

### 3.3. Guide: How to Upload and Normalize Lead Databases
Voqly supports multiple formats for importing lead spreadsheets:
1.  **Spreadsheet CSV File Upload**:
    *   Drag and drop your contact CSV file containing columns like `phone`, `name`, `email`.
2.  **Google Sheet Integration**:
    *   Make your Google Sheet public by clicking **Share** -> **Anyone with the link can view** (must be set as Viewer).
    *   Paste the public Google Sheet sharing URL in the text field in Step 2 of the uploader.
    *   The backend automatically downloads the spreadsheet data as a CSV format representation and processes it into the database campaign table.
3.  **Lead Phone Number Normalization**:
    *   Select the **Default Country Code** (e.g. India `+91`, United States `+1`) in the dropdown below the file upload.
    *   Voqly will clean format symbols, hyphens, and spaces.
    *   If country prefixes are missing, it will automatically prepend the selected default country code to format all numbers to the clean E.164 standard.
    *   Verify the corrected numbers instantly in the uploader's live preview table before submitting.

### 3.4. Guide: CRM Integrations Step-by-Step

#### Salesforce Setup:
1.  Log in to your Salesforce Org as an Administrator.
2.  Go to the **Setup** menu, search for **Call Center** -> **Directory**, and configure the Voqly Open CTI configuration file.
3.  Add users to the Call Center layout.
4.  Map the custom Voqly activity fields (e.g. `call_duration`, `call_recording_url`, `call_disposition`) to the standard **Task** object.
5.  Voqly will automatically record task history logs on standard Contact, Lead, and Account records instantly upon call hangup.

#### HubSpot Setup:
1.  Navigate to your Voqly settings under the **Integrations** tab.
2.  Click **Connect HubSpot**.
3.  Log in to HubSpot and authorize the Voqly app scopes.
4.  Select standard pipelines to match incoming Caller IDs (e.g., Contacts, Deals).
5.  Voqly will log call activity timelines under target contacts automatically.

---

## 4. Troubleshooting FAQ & Diagnostics

### 4.1. The AI Agent says technical token names like "[CONVERSATION_ENDED]"
*   *Cause*: Legacy prompts forced agents to output termination tokens, which were sometimes spoken.
*   *Solution*: The latest update redirects voice agents to end calls naturally by speaking polite goodbye phrases (e.g., *"Have a great day. Goodbye!"*) and terminating the SIP line automatically 2.2 seconds later. Ensure your system prompts do not include brackets `[]` or end token instructions.

### 4.2. Inbound voice agent does not respond or overlaps speech
*   *Cause*: Microphone noise, high network latency, or incorrect voice provider configuration.
*   *Solution*: Adjust the voice sensitivity slider in agent settings. Ensure ElevenLabs API keys are active. For browser-based calling, grant microphone permission when prompted.

### 4.3. Google Sheet lead upload fails with "Permission Denied"
*   *Cause*: The Google Sheet link is not shared publicly.
*   *Solution*: Open the spreadsheet, click **Share**, change access level from **Restricted** to **Anyone with the link can view**, and copy the new link.

### 4.4. Telephony calls fail or go to voicemail instantly
*   *Cause*: Caller ID (caller number) is unverified or lacks outbound balance.
*   *Solution*: Ensure the selected Plivo or Twilio phone number is fully provisioned in the Super Admin dashboard and has active credits.

### 4.5. CRM sync delay or missing call log activity timelines
*   *Cause*: Invalid API key authorization, expired OAuth tokens, or field mapping validation errors.
*   *Solution*: Go to **Settings** -> **Integrations**, select **Test Sync Connection** to run standard diagnostics, and verify that the API scopes are authorized.
