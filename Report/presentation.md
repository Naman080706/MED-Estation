# 🚀 AI-Powered Pharmacy Inventory Platform

## 1. Core Vision (What We Are Doing)
We are building a **Real-Time, Event-Driven, AI-Native Inventory Platform** designed specifically for high-stakes pharmacy environments. Moving beyond standard CRUD applications, this is an autonomous system that processes complex data streams, executes independent decisions (like automated restocking), guarantees cryptographic data integrity, and seamlessly connects digital inventory to physical-world supplier communications.

---

## 2. The Tech Stack
### ⚙️ Backend Core
* **Language & Framework:** Python, FastAPI (Highly performant, fully asynchronous)
* **Architecture Pattern:** Event-Driven Architecture (EDA)
* **Real-time Engine:** WebSockets & Server-Sent Events (SSE)
* **Message Broker:** `asyncio` Queues (for high-speed monolithic async) / Redis Pub/Sub

### 🧠 AI Core & Models
* **Demand Forecasting:** Prophet / Lightweight LSTM (Multivariate capability)
* **Waste & Anomaly Analytics:** Isolation Forests / Z-Score algorithms
* **Agentic Chatbot Framework:** LangChain / LlamaIndex
* **LLM Engine:** Groq API (chosen for ultra-low latency inference and advanced tool-calling)

### 🔌 APIs & External Integrations
* **Automated Comms:** Twilio API (SMS Alerts) & SendGrid API (Automated HTML Purchase Orders)
* **Vision & Extraction:** `pytesseract` (Optical Character Recognition)

---

## 3. Architecture Design (How It Works)
Our platform operates on a frictionless **Asynchronous Event Pipeline**:

1. **Trigger & Ingestion:** Real-world actions (e.g., capturing a new prescription scan, uploading a supplier batch) trigger system events like `[PRESCRIPTION_SCANNED]` or `[STOCK_UPLOADED]`.
2. **Background AI Processing:** The message broker routes data to AI worker services without blocking the main application. Forecasting models dynamically recalculate real-time demand on the fly.
3. **Autonomous Execution:** When algorithms detect critical thresholds (e.g., a localized demand spike), the system triggers predefined operational tools:
   * Autonomously drafts and emails a Purchase Order to the vendor via SendGrid.
   * Pings the Pharmacy Manager via Twilio SMS alerting them of expiring or depleted critical stock.
4. **Live UI Sync:** The frontend dashboard maintains an open SSE/WebSocket connection, rendering toast notifications and updating heatmaps instantly—zero polling or manual page refreshing required.

---

## 4. Advanced Differentiators (What Else We Are Planning)
*While the platform naturally handles Demand Forecasting, FEFO Management, Waste Analytics, and Chatbots, our hackathon-winning differentiators include the following:*

### 🛡️ Immutable Audit Ledger (Anti-Fraud)
* **How:** Implements a blockchain-inspired Hash Chain. Every stock adjustment or sensitive action generates a cryptographically secure audit row linking its hash to the previous transaction's hash.
* **Impact:** Guarantees absolute accountability and compliance. It completely prevents the post-facto tampering of controlled substance (Schedule H) inventory records.

### 👁️ Real-Time Prescription OCR Pipeline
* **How:** Prescriptions are uploaded and parsed by Tesseract OCR on the spot, extracting drug names, dosages, and quantities.
* **Impact:** Injects this exact "future demand" into the data stream before the patient even checks out, allowing the prediction model to become proactive instead of purely relying on historical data.

### 🤖 Autonomous Tool-Calling Agent
* **How:** The chatbot is not limited to conversational text answering—it is an *Action Agent*.
* **Impact:** If a manager instructs the UI to "Order 100 boxes of Paracetamol," the LLM maps the intent directly to python functions, autonomously executing `trigger_reorder(ndc, 100)` and finalizing the transaction with the supplier.

### ⏱️ Dynamic Data Partitioning Simulation
* **How:** Instead of just querying static Kaggle CSVs, the backend acts as a complex simulation engine, partitioning huge historical datasets into simulated "daily batches" that fire dynamically.
* **Impact:** Proves true real-time reactivity and the power of event-driven processing during a live demo.
