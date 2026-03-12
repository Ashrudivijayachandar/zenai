// ============================================================
// CHAT CONTROLLER — Processes conversational queries
// Pipeline: User Query → AI Service → Action Router → Response
// ============================================================

const { processQuery } = require("../services/aiService");
const { executeAction } = require("../services/actionRouter");
const { readData, writeData } = require("../services/dataService");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "zenai_jwt_secret_university_2026";

// OpenAI API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "your-gemini-api-key-here";

const DELETE_ACTIONS = new Set(["delete_student", "delete_faculty", "delete_course", "delete_marks"]);
const CONFIRM_YES = /^(yes|y|confirm|proceed|do it|sure|ok)$/i;
const CONFIRM_NO = /^(no|n|cancel|stop|abort|nevermind|never mind)$/i;

function getConversationUserKey(currentUser) {
  return currentUser?.id ? String(currentUser.id) : "anonymous";
}

function ensureAgentMeta(agent) {
  if (!agent.pendingConfirmations || typeof agent.pendingConfirmations !== "object") {
    agent.pendingConfirmations = {};
  }
}

/**
 * POST /api/chat/:agentId — Send a message to an agent
 *
 * Complete workflow:
 *  1. Validate the agent exists
 *  2. Send query + system prompt to AI service
 *  3. Validate the AI's chosen action is allowed for this agent
 *  4. Execute the action via the action router
 *  5. Log the interaction
 *  6. Return conversational response + data to frontend
 */
async function sendMessage(req, res) {
  try {
    const agentId = parseInt(req.params.agentId);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    // Extract logged-in user from JWT (optional — works without auth too)
    let currentUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        currentUser = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      } catch { /* token invalid — proceed without user context */ }
    }

    // Step 1: Find the agent
    const agents = readData("agents.json");
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    // Role guard — block faculty from using student agents and vice versa
    if (currentUser && agent.role && agent.role !== currentUser.role) {
      const agentRoleLabel = agent.role === "student" ? "Student" : "Faculty";
      const userRoleLabel  = currentUser.role === "faculty" ? "Faculty" : "Student";
      return res.json({
        success: true,
        data: {
          response: `⚠️ This is a **${agentRoleLabel} Agent**. You are logged in as **${userRoleLabel}**. Please use the agents designed for ${userRoleLabel === "Faculty" ? "Faculty" : "Students"} — they have the right data for you!`,
          action: null,
          actionResult: null,
        },
      });
    }

    // Step 2: Handle pending destructive-action confirmation before new NLP parsing
    const userKey = getConversationUserKey(currentUser);
    ensureAgentMeta(agent);
    const pending = agent.pendingConfirmations[userKey];
    if (pending && pending.action && pending.data) {
      if (CONFIRM_YES.test(String(message || "").trim())) {
        const actionResult = executeAction(pending.action, pending.data, currentUser);

        delete agent.pendingConfirmations[userKey];
        const agentIdx = agents.findIndex((a) => a.id === agentId);
        if (!agents[agentIdx].chatHistory) agents[agentIdx].chatHistory = [];
        agents[agentIdx].chatHistory.push({
          user: message,
          ai: actionResult.message,
          action: pending.action,
          timestamp: new Date().toISOString(),
        });
        if (!agents[agentIdx].actionLog) agents[agentIdx].actionLog = [];

        const logs = readData("logs.json");
        const logEntry = {
          id: logs.length + 1,
          agentId: agent.id,
          agentName: agent.name,
          userMessage: message,
          aiAction: pending.action,
          actionData: pending.data,
          result: actionResult.success,
          timestamp: new Date().toISOString(),
        };
        logs.push(logEntry);
        agents[agentIdx].actionLog.push(logEntry);
        writeData("logs.json", logs);
        writeData("agents.json", agents);

        return res.json({
          success: true,
          data: {
            response: actionResult.message,
            action: pending.action,
            actionResult,
            aiRawAction: { action: pending.action, data: pending.data },
          },
        });
      }

      if (CONFIRM_NO.test(String(message || "").trim())) {
        delete agent.pendingConfirmations[userKey];
        const agentIdx = agents.findIndex((a) => a.id === agentId);
        if (!agents[agentIdx].chatHistory) agents[agentIdx].chatHistory = [];
        agents[agentIdx].chatHistory.push({
          user: message,
          ai: "Deletion cancelled. No records were changed.",
          action: null,
          timestamp: new Date().toISOString(),
        });
        writeData("agents.json", agents);

        return res.json({
          success: true,
          data: {
            response: "Deletion cancelled. No records were changed.",
            action: null,
            actionResult: null,
            aiRawAction: null,
          },
        });
      }

      return res.json({
        success: true,
        data: {
          response: "Please reply with YES to confirm deletion or NO to cancel.",
          action: null,
          actionResult: null,
          aiRawAction: null,
        },
      });
    }

    // Step 3: Send to AI service (Gemini or mock)
    const liveContext = {
      students: readData("students.json").map(s => ({ name: s.name, department: s.department })),
      faculty:  readData("faculty.json").map(f => ({ name: f.name, department: f.department })),
      courses:  readData("courses.json").map(c => ({ name: c.name, code: c.code })),
    };
    const history = Array.isArray(agent.chatHistory) ? agent.chatHistory : [];
    const previousTurn = history.length > 0 ? history[history.length - 1] : null;
    const conversationContext = {
      history: history.slice(-20),
      lastTurn: previousTurn
        ? {
            lastUserMessage: previousTurn.user || "",
            lastAiAction: previousTurn.action || null,
            lastAiResponse: previousTurn.ai || "",
          }
        : null,
    };

    const aiResult = await processQuery(
      agent.systemPrompt,
      message,
      GEMINI_API_KEY,
      agent.allowedActions,
      liveContext,
      agent.id,
      conversationContext
    );

    let actionResult = null;
    let actionExecuted = null;
    let responseText = aiResult.response;

    // Step 4: If AI returned a structured action, validate and execute it
    if (aiResult.action && aiResult.action.action) {
      let actionName = aiResult.action.action;

      // Action normalization — try to fix mismatched action names before rejecting
      if (!agent.allowedActions.includes(actionName)) {
        // Fuzzy match: find an allowed action containing the key topic
        const topics = actionName.replace(/^(view_|list_|view_my_|get_|show_|check_)/, "").split("_");
        const fuzzy = agent.allowedActions.find(a => topics.some(t => a.includes(t)));
        if (fuzzy) {
          console.log(`[Action Normalizer] "${actionName}" → "${fuzzy}"`);
          actionName = fuzzy;
          aiResult.action.action = fuzzy;
        }
      }

      // Domain restriction check — agent can only execute its allowed actions
      if (agent.allowedActions.includes(actionName)) {
        // Destructive actions require explicit confirmation.
        if (DELETE_ACTIONS.has(actionName)) {
          ensureAgentMeta(agent);
          agent.pendingConfirmations[userKey] = {
            action: actionName,
            data: aiResult.action.data || {},
            createdAt: new Date().toISOString(),
          };

          const targetLabel = aiResult.action.data?.name || aiResult.action.data?.studentName || "the selected record(s)";
          responseText = `Please confirm deletion of ${targetLabel}. Reply YES to continue or NO to cancel.`;
        } else {
          // Step 5: Execute via action router, pass current user for "my" data queries
          actionResult = executeAction(actionName, aiResult.action.data || {}, currentUser);
          actionExecuted = actionName;
        }
      } else {
        // Instead of hard error, return a helpful redirect
        actionResult = {
          success: false,
          message: `That looks like a different domain! 🎯 This agent handles: ${agent.allowedActions.map(a => a.replace(/_/g, " ")).join(", ")}. Try asking about one of those topics!`,
          data: null,
        };
      }
    }

    // Step 6: Log the interaction
    const logs = readData("logs.json");
    const logEntry = {
      id: logs.length + 1,
      agentId: agent.id,
      agentName: agent.name,
      userMessage: message,
      aiAction: actionExecuted,
      actionData: aiResult.action?.data || null,
      result: actionResult ? actionResult.success : null,
      timestamp: new Date().toISOString(),
    };
    logs.push(logEntry);
    writeData("logs.json", logs);

    // Also store in agent's chat history
    const agentIdx = agents.findIndex((a) => a.id === agentId);
    if (!agents[agentIdx].chatHistory) agents[agentIdx].chatHistory = [];
    agents[agentIdx].chatHistory.push({
      user: message,
      ai: responseText,
      action: actionExecuted,
      timestamp: new Date().toISOString(),
    });
    if (!agents[agentIdx].actionLog) agents[agentIdx].actionLog = [];
    if (actionExecuted) {
      agents[agentIdx].actionLog.push(logEntry);
    }
    writeData("agents.json", agents);

    // Step 7: Build final response for chat UI
    if (actionResult) {
      responseText = actionResult.message;
    }

    res.json({
      success: true,
      data: {
        response: responseText,
        action: actionExecuted,
        actionResult: actionResult,
        aiRawAction: aiResult.action,
      },
    });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/**
 * GET /api/chat/:agentId/history — Get chat history for an agent
 */
function getChatHistory(req, res) {
  const agents = readData("agents.json");
  const agent = agents.find((a) => a.id === parseInt(req.params.agentId));
  if (!agent) return res.status(404).json({ success: false, message: "Agent not found" });
  res.json({ success: true, data: agent.chatHistory || [] });
}

module.exports = { sendMessage, getChatHistory };
