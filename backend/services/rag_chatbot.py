import logging
import asyncio
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from groq import Groq

from ..config import settings
from ..database import get_db
from ..models.inventory import StockBatch, Drug, BatchStatus, Supplier, SalesLog
from ..models.clinical import Patient, Doctor, Prescription
from .communications import trigger_supplier_reorder

logger = logging.getLogger(__name__)

class RAGInventoryAgent:
    """
    Action-Oriented RAG Agent powered by Groq (GroqCloud) or pure DB rules.
    It MUST answer strictly from the pharmacy database context we inject,
    never from its own general knowledge. If the answer is not derivable
    from context, it should say it does not know based on current data.
    """
    def __init__(self):
        self.groq_api_key = settings.GROQ_API_KEY
        self.llm_initialized = False
        self.client: Groq | None = None

        if self.groq_api_key:
            try:
                # Groq Python SDK client; model is chosen per-request
                self.client = Groq(api_key=self.groq_api_key)
                self.llm_initialized = True
                logger.info("Groq client initialized successfully for MED‑Esarthi chatbot.")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client, falling back to rule-based mode only: {e}")
        else:
            logger.warning("No GROQ_API_KEY found. MED‑Esarthi will run in pure DB rule-based mode.")

    async def get_inventory_context(self, db: AsyncSession) -> str:
        """
        Builds a compact, multi-table snapshot from ALL seeded datasets:
        - Inventory (drugs, batches, stock statuses, suppliers)
        - Clinical (patients, doctors, prescriptions)
        - Sales (sales_logs)
        This is what MED‑Esarthi sees when answering.
        """
        # Critical / near-expiry inventory
        critical_result = await db.execute(
            select(Drug.brand_name, func.sum(StockBatch.quantity))
            .select_from(StockBatch)
            .join(Drug)
            .where(StockBatch.status.in_([BatchStatus.CRITICAL, BatchStatus.APPROACHING_EXPIRY]))
            .group_by(Drug.brand_name)
        )
        critical_items = critical_result.all()

        # Summary counts across all major tables
        drugs_count = (await db.execute(select(func.count()).select_from(Drug))).scalar() or 0
        batches_count = (await db.execute(select(func.count()).select_from(StockBatch))).scalar() or 0
        suppliers_count = (await db.execute(select(func.count()).select_from(Supplier))).scalar() or 0
        patients_count = (await db.execute(select(func.count()).select_from(Patient))).scalar() or 0
        doctors_count = (await db.execute(select(func.count()).select_from(Doctor))).scalar() or 0
        prescriptions_count = (await db.execute(select(func.count()).select_from(Prescription))).scalar() or 0

        # Simple top-5 most prescribed drugs (by quantity)
        top_rx_result = await db.execute(
            select(Drug.brand_name, func.sum(Prescription.quantity).label("total_qty"))
            .select_from(Prescription)
            .join(Drug, Prescription.drug_ndc == Drug.ndc)
            .group_by(Drug.brand_name)
            .order_by(func.sum(Prescription.quantity).desc())
            .limit(5)
        )
        top_rx = top_rx_result.all()

        lines: list[str] = []

        # High-level entities summary
        lines.append("**Data Snapshot (from all linked tables)**")
        lines.append(f"- **Drugs**: {drugs_count} unique SKUs")
        lines.append(f"- **Stock Batches**: {batches_count}")
        lines.append(f"- **Suppliers**: {suppliers_count}")
        lines.append(f"- **Patients**: {patients_count}")
        lines.append(f"- **Doctors**: {doctors_count}")
        lines.append(f"- **Prescriptions**: {prescriptions_count}")
        lines.append("")

        # Critical inventory
        lines.append("**Critical / Near‑Expiry Inventory Snapshot**")
        if not critical_items:
            lines.append("- No items currently in critical or approaching‑expiry status.")
        else:
            for brand, qty in critical_items:
                lines.append(f"- {brand}: {qty} units remaining")
        lines.append("")

        # Top prescribed drugs
        lines.append("**Top Prescribed Drugs (by quantity in prescriptions)**")
        if not top_rx:
            lines.append("- No prescription data available.")
        else:
            for brand, total_qty in top_rx:
                lines.append(f"- {brand}: {int(total_qty)} units prescribed")

        return "\n".join(lines)

    async def answer_from_rules(self, query: str, db: AsyncSession) -> Dict[str, Any]:
        """
        Fully free, rule-based fallback chatbot that only uses the pharmacy DB.
        This runs when Groq is unavailable or when USE_MOCK_APIS is enabled.
        """
        q = query.lower()
        context = await self.get_inventory_context(db)

        # Simple intent routing
        if "critical" in q or "near expiry" in q or "approaching" in q:
            return {
                "reply": (
                    "Here is the current critical / near‑expiry inventory snapshot from the live database:\n\n"
                    f"{context}"
                ),
                "action_taken": False,
            }

        if "low stock" in q or "low-stock" in q or "stockout" in q:
            return {
                "reply": (
                    "I currently track critical and approaching‑expiry items. "
                    "Use the Inventory Matrix and Alerts panels to see low‑stock risks in more detail."
                ),
                "action_taken": False,
            }

        if "value" in q or "inventory value" in q:
            # Reuse the reports dashboard summary for a quick numeric answer
            from . import demand_forecasting  # type: ignore  # just to avoid circular hints
            # We avoid importing routers; instead tell user to look at dashboard
            return {
                "reply": (
                    "The precise inventory value is shown on the Command Dashboard card "
                    "('Total Inventory Value') in real‑time. I currently surface detailed "
                    "per‑drug numbers via the Inventory Matrix, not text."
                ),
                "action_taken": False,
            }

        # Generic fallback: echo context + query, but clearly
        return {
            "reply": (
                "I can answer questions about the current pharmacy inventory only.\n\n"
                f"{context}\n\n"
                f"Based on this snapshot, I don't have enough structured information to fully answer: '{query}'."
            ),
            "action_taken": False,
        }

    async def process_query(self, query: str, db: AsyncSession) -> Dict[str, Any]:
        """
        Processes a user natural language query.
        Returns the text reply and any action taken (like a reorder).
        """
        logger.info(f"RAG Agent received query: {query}")
        
        # 1. Action intent parser (Naive keyword-based for fallback, or LLM-based if configured)
        if "reorder" in query.lower() or "order" in query.lower():
            # Mock action extraction
            # In a full LangChain implementation, this would use `bind_tools` with Pydantic schemas.
            dummy_ndc = "79690" # e.g., Calpol
            dummy_brand = "Calpol"
            dummy_qty = 50
            
            # Execute the action via our existing service
            await trigger_supplier_reorder("supplier@example.com", "+123456789", dummy_ndc, dummy_brand, dummy_qty)
            
            return {
                "reply": f"I have successfully triggered a purchase order for {dummy_qty} units of {dummy_brand}. The supplier has been emailed.",
                "action_taken": True,
                "action_details": {"type": "reorder", "ndc": dummy_ndc, "qty": dummy_qty}
            }
            
        # 2. RAG QA querying
        context = await self.get_inventory_context(db)

        # If Groq is configured and mock mode is disabled, use Groq LLM; otherwise pure DB rules
        if self.llm_initialized and self.client is not None and not settings.USE_MOCK_APIS:
            system_prompt = (
                "You are MED‑Esarthi, an expert pharmacy inventory assistant running inside MED‑Estation.\n"
                "You have ONLY the following Context, which comes directly from the live pharmacy database "
                "(drugs, batches, stock levels, statuses, and alerts).\n\n"
                f"Context:\n{context}\n\n"
                "CRITICAL RULES:\n"
                "1) You MUST base every answer strictly on this Context.\n"
                "2) Do NOT use any outside/world knowledge, clinical advice, or guesses.\n"
                "3) If the Context is missing information needed to answer, respond with exactly:\n"
                "   \"I don't know based on the current pharmacy database context.\"\n"
                "4) Stay focused on inventory, stock levels, expiry, and pharmacy operations only.\n"
                "5) Format your answer as short, clean Markdown suitable for rendering in a React chat UI. "
                "Use bullet lists and **bold** for key numbers. Do NOT wrap the entire answer in code fences."
            )
            try:
                # Call Groq chat completions in a thread so we don't block the event loop
                response = await asyncio.to_thread(
                    self.client.chat.completions.create,
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": query},
                    ],
                    temperature=0.0,
                )
                reply_text = response.choices[0].message.content.strip()
                return {
                    "reply": reply_text,
                    "action_taken": False,
                }
            except Exception as e:
                logger.error(f"Groq LLM error, falling back to rule-based mode: {e}")
                return await self.answer_from_rules(query, db)

        # Purely free, DB‑only chatbot (no Groq or mock)
        return await self.answer_from_rules(query, db)

agent = RAGInventoryAgent()
