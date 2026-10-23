import json
from typing import Dict, Any, List
from datetime import datetime

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.agents.states import AnalysisState
from app.agents.prompts.agent_prompts import DIRECT_RESPONDER_SYSTEM_PROMPT
from app.agents.llm_factory import get_chat_model


def generate_direct_fallback_response(query: str, schema: Dict[str, Any]) -> str:
    """
    Intelligent direct answer fallback when running offline without an active LLM key.
    Provides helpful, comprehensive explanations for questions and concepts.
    """
    q_lower = query.lower()

    if any(k in q_lower for k in ["hi", "hello", "hey", "who are you", "what can you do"]):
        cols = [c.get("name") for c in schema.get("columns", [])] if schema else []
        dataset_note = (
            f"\n\n📂 **Active Dataset**: `{len(cols)}` columns detected ({', '.join(cols[:5])}{'...' if len(cols) > 5 else ''})."
            if cols else "\n\n💡 *Tip: You can ask general questions or upload a CSV dataset anytime to run calculations and render charts.*"
        )
        return (
            "### 👋 Hello! I am your AI Analytics Assistant\n\n"
            "You can interact with me in two ways:\n"
            "1. **💬 Ask Direct Questions**: Ask about data concepts, machine learning, statistical metrics, or business advice.\n"
            "2. **🛠️ Automated Tool Execution**: Ask me to calculate metrics, audit data cleanliness, or render charts, and I will execute the specialized tools.\n"
            f"{dataset_note}\n\n"
            "How can I assist you today?"
        )

    # Pie chart and chart advisory inquiries
    if any(k in q_lower for k in ["pie chart", "pie-chart", "pie_chart"]) or (
        any(k in q_lower for k in ["chart", "plot", "visualize", "visualization"])
        and any(k in q_lower for k in ["good", "better", "best", "recommend", "should i", "mode", "way", "choice", "option", "suit"])
    ):
        cols = [c.get("name") for c in schema.get("columns", []) if isinstance(c, dict)] if schema else []
        cat_cols = [c.get("name") for c in schema.get("columns", []) if isinstance(c, dict) and any(t in str(c.get("type", "")).lower() for t in ["str", "obj", "cat", "text"])] if schema else []
        num_cols = [c.get("name") for c in schema.get("columns", []) if isinstance(c, dict) and any(t in str(c.get("type", "")).lower() for t in ["int", "float", "num"])] if schema else []

        col_context = ""
        if cols:
            cat_sample = f"`{', '.join(cat_cols[:3])}`" if cat_cols else "categorical variables"
            num_sample = f"`{', '.join(num_cols[:3])}`" if num_cols else "numeric values"
            col_context = (
                f"\n\n#### 📌 Tailored Recommendation for Your Dataset:\n"
                f"- **For Categorical Columns ({cat_sample})**: Use a **Horizontal Bar Chart** with sorted frequencies.\n"
                f"- **For Continuous Metrics ({num_sample})**: Use a **Histogram** or **Box Plot** to analyze distribution, central tendency, and outliers.\n"
                f"- **For Relationships**: Use a **Scatter Plot** to explore correlations between numerical pairs."
            )

        return (
            "### 🥧 Verdict: Are Pie Charts a Good Choice?\n\n"
            "In most modern data analysis and business intelligence workflows, **pie charts are generally not recommended**.\n\n"
            "Data visualization experts (such as Edward Tufte and Stephen Few) widely advise against them due to core human cognitive and perceptual limitations:\n\n"
            "| Dimension | 🥧 Pie Chart | 📊 Recommended Alternative |\n"
            "| :--- | :--- | :--- |\n"
            "| **Human Perception** | Relies on judging angles and circular areas (notoriously inaccurate) | Relies on linear length along a shared axis (highly accurate & fast) |\n"
            "| **Category Capacity** | Breaks down with > 3–4 categories (slices become tiny and unreadable) | **Bar Chart** effortlessly handles 10–50+ categories with clear sorting |\n"
            "| **Subtle Differences** | Hard to distinguish close percentages (e.g., 22% vs 25% looks identical) | Minute differences are instantly visible on a linear scale |\n"
            "| **Continuous Data** | Cannot depict numeric ranges, variance, or distributions | **Histogram / Box Plot** displays distribution, skew, and spread |\n"
            "| **Negative / Zero Values** | Impossible to plot negative numbers or zeros | **Bar Chart** cleanly plots below the 0-baseline |\n\n"
            "#### ⚠️ The Rare Exceptions (When a Pie or Donut Chart Works):\n"
            "A pie chart or donut chart is acceptable **only** when:\n"
            "1. You have **strictly 2 to 3 categories** (e.g., *Yes / No*, *Paid / Free*).\n"
            "2. The categories sum strictly to **100%** (a true part-to-whole relationship).\n"
            "3. The differences between categories are obvious and prominent.\n\n"
            "#### 🚀 What You Should Use Instead:\n"
            "1. **Horizontal Bar Chart**: The undisputed standard for categorical comparisons, rankings, and long label names.\n"
            "2. **Stacked 100% Bar Chart**: Superior for showing part-to-whole proportions across multiple subgroups.\n"
            "3. **Donut Chart**: A cleaner modern visual when you must show 2–3 proportions, allowing a central KPI metric.\n"
            "4. **Treemap**: Ideal for multi-level or hierarchical category breakdowns where space is constrained."
            f"{col_context}\n\n"
            "💡 *Tip: If you'd like to generate any of these charts, simply ask: `\"Plot a horizontal bar chart of [column]\"`!*"
        )

    if any(k in q_lower for k in ["churn", "customer churn"]):
        return (
            "### 🔄 Understanding Customer Churn\n\n"
            "**Customer Churn** refers to the percentage of customers who stop using a company's product or service over a specific time window.\n\n"
            "#### 📊 Formula\n"
            r"$$\text{Churn Rate} = \frac{\text{Lost Customers during Period}}{\text{Total Customers at Start of Period}} \times 100$$"
            "\n\n"
            "#### 🎯 Key Drivers & Mitigations:\n"
            "- **Onboarding Friction**: Ensure early customer adoption and time-to-value.\n"
            "- **Service/Product Gaps**: Identify negative feedback patterns or unresolved tickets.\n"
            "- **Pricing/Value Mismatch**: Offer flexible tiers or loyalty incentives.\n"
            "- **Predictive Churn Modeling**: Use logistic regression or gradient boosting (XGBoost) to flag at-risk accounts early."
        )

    if any(k in q_lower for k in ["retention", "retention rate"]):
        return (
            "### 📈 Customer Retention Rate (CRR)\n\n"
            "**Customer Retention** measures a company's ability to keep its customers over a given timeframe.\n\n"
            "#### 📊 Calculation Formula\n"
            r"$$\text{CRR} = \frac{E - N}{S} \times 100$$"
            "\nWhere:\n"
            "- $E$ = Number of customers at the end of the period\n"
            "- $N$ = Number of new customers acquired during the period\n"
            "- $S$ = Number of customers at the start of the period\n\n"
            "A high retention rate indicates strong product-market fit and customer satisfaction."
        )

    if any(k in q_lower for k in ["p-value", "p value", "hypothesis"]):
        return (
            "### 🧪 What is a P-Value in Statistics?\n\n"
            "A **p-value** (probability value) measures the probability of obtaining test results at least as extreme as the observed results, assuming that the **null hypothesis ($H_0$) is true**.\n\n"
            "#### 📌 Decision Rule:\n"
            "- **$p < 0.05$ (Typical significance level $\\alpha = 0.05$)**: Reject the null hypothesis. The observed effect is statistically significant.\n"
            "- **$p \\ge 0.05$**: Fail to reject the null hypothesis. There is not enough evidence to support an effect."
        )

    if any(k in q_lower for k in ["outlier", "anomaly"]):
        return (
            "### 🔍 Understanding Outliers in Data Analysis\n\n"
            "An **outlier** is an observation that lies an abnormal distance from other values in a random sample.\n\n"
            "#### 🛠️ Common Detection Methods:\n"
            "1. **Z-Score Method**: Data points with $|Z| > 3$ are typically considered outliers (assuming normal distribution).\n"
            "2. **Interquartile Range (IQR)**:\n"
            r"   - $\text{Lower Bound} = Q_1 - 1.5 \times \text{IQR}$"
            "\n"
            r"   - $\text{Upper Bound} = Q_3 + 1.5 \times \text{IQR}$"
            "\n"
            "3. **Isolation Forest / DBSCAN**: Machine learning approaches for multi-dimensional anomaly detection."
        )

    if any(k in q_lower for k in ["correlation", "pearson"]):
        return (
            "### 🔗 Correlation Analysis\n\n"
            "**Correlation** measures the strength and direction of a linear relationship between two variables.\n\n"
            "- **$+1.0$**: Perfect positive correlation (as one increases, the other increases).\n"
            "- **$0.0$**: No linear correlation.\n"
            "- **$-1.0$**: Perfect negative correlation.\n\n"
            "⚠️ *Reminder: Correlation does not imply causation.*"
        )

    # General fallback
    cols = [c.get("name") for c in schema.get("columns", [])] if schema else []
    col_str = f"Your current dataset contains columns: `{', '.join(cols[:8])}`." if cols else "No dataset is currently attached."
    return (
        f"### 💡 Insights & Response\n\n"
        f"Regarding your query: *\"{query}\"*\n\n"
        f"{col_str}\n\n"
        f"To perform exact statistical computations, aggregations, or generate visual charts, "
        f"you can ask me to calculate or plot specific columns, and I will execute the analytical tools."
    )


def direct_responder_agent(state: AnalysisState) -> AnalysisState:
    """
    Direct LLM Responder Agent Node.
    Answers natural language queries directly without executing unnecessary tools.
    Provides intelligent explanations, domain advice, definitions, or conversation.
    """
    query = state.get("user_query", "")
    schema = state.get("dataset_schema", {})
    history = state.get("chat_history", [])

    llm = get_chat_model()

    if llm:
        messages = [SystemMessage(content=DIRECT_RESPONDER_SYSTEM_PROMPT)]

        # Provide dataset schema context if available
        if schema and schema.get("columns"):
            cols = [c.get("name") for c in schema.get("columns", []) if isinstance(c, dict)]
            preview = schema.get("sample_preview", [])[:2]
            context_note = (
                f"Active Dataset Context:\n"
                f"- Total Rows: {schema.get('total_rows', 'Unknown')}\n"
                f"- Columns: {json.dumps(cols)}\n"
                f"- Sample Preview: {json.dumps(preview, default=str)}"
            )
            messages.append(SystemMessage(content=context_note))

        # Append recent chat history (up to last 6 messages)
        if history:
            for msg in history[-6:]:
                role = msg.get("role")
                content = msg.get("content", "")
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))

        messages.append(HumanMessage(content=query))

        try:
            response = llm.invoke(messages)
            answer = response.content if hasattr(response, "content") else str(response)
        except Exception as e:
            print(f"[DIRECT-RESPONDER] LLM invocation failed: {e}. Falling back to heuristic.")
            answer = generate_direct_fallback_response(query, schema)
    else:
        answer = generate_direct_fallback_response(query, schema)

    state["direct_response"] = answer
    state["tool_required"] = False
    state["tool_used"] = []

    # Record agent step
    steps = state.get("agent_steps") or []
    steps.append({
        "agent": "LLM Assistant",
        "status": "completed",
        "summary": "Direct response provided by LLM (no tool required).",
        "timestamp": datetime.utcnow().isoformat(),
        "tool_required": False
    })
    state["agent_steps"] = steps

    return state
