const { processQuery } = require("../services/aiService");
const { executeAction } = require("../services/actionRouter");
const { readData, writeData } = require("../services/dataService");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "zenai_jwt_secret_university_2026";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "your-gemini-api-key-here";

const DELETE_ACTIONS = new Set(["delete_student", "delete_faculty", "delete_course", "delete_marks"]);
const CONFIRM_YES = /^(yes|y|confirm|proceed|do it|sure|ok)$/i;
const CONFIRM_NO = /^(no|n|cancel|stop|abort|nevermind|never mind)$/i;
const REQUIRE_DELETE_CONFIRMATION =
  String(process.env.REQUIRE_DELETE_CONFIRMATION || "false").toLowerCase() === "true";

function getConversationUserKey(currentUser) {
  return currentUser?.id ? String(currentUser.id) : "anonymous";
}

function ensureAgentMeta(agent) {
  if (!agent.pendingConfirmations || typeof agent.pendingConfirmations !== "object") {
    agent.pendingConfirmations = {};
  }
}

async function sendMessage(req, res) {
  try {
    const agentId = parseInt(req.params.agentId, 10);
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    let currentUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        currentUser = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      } catch {
        // Continue unauthenticated for public-safe flows.
      }
    }

    const agents = readData("agents.json");
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    if (currentUser && agent.role && agent.role !== currentUser.role) {
      const agentRoleLabel = agent.role === "student" ? "Student" : "Faculty";
      const userRoleLabel = currentUser.role === "faculty" ? "Faculty" : "Student";
      return res.json({
        success: true,
        data: {
          response:
            `This is a ${agentRoleLabel} Agent. You are logged in as ${userRoleLabel}. ` +
            `Please use agents designed for ${userRoleLabel === "Faculty" ? "Faculty" : "Students"}.`,
          action: null,
          actionResult: null,
        },
      });
    }

    const userKey = getConversationUserKey(currentUser);
    ensureAgentMeta(agent);

    const pending = agent.pendingConfirmations[userKey];
    if (pending && pending.action && pending.data) {
      if (CONFIRM_YES.test(String(message).trim())) {
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

        if (!agents[agentIdx].actionLog) agents[agentIdx].actionLog = [];
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

      if (CONFIRM_NO.test(String(message).trim())) {
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

      const isNewIntent =
        /\b(show|list|view|get|create|add|enroll|update|delete|remove|record|schedule|assign|report|marks?|courses?|students?|faculty|attendance|exam|profile|notice)\b/i.test(
          String(message)
        );

      if (isNewIntent) {
        delete agent.pendingConfirmations[userKey];
      } else {
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
    }

    const liveContext = {
      students: readData("students.json").map((s) => ({ name: s.name, department: s.department })),
      faculty: readData("faculty.json").map((f) => ({ name: f.name, department: f.department })),
      courses: readData("courses.json").map((c) => ({ name: c.name, code: c.code })),
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

    if (aiResult.action && aiResult.action.action) {
      let actionName = aiResult.action.action;

      if (!agent.allowedActions.includes(actionName)) {
        const topics = actionName.replace(/^(view_|list_|view_my_|get_|show_|check_)/, "").split("_");
        const fuzzy = agent.allowedActions.find((a) => topics.some((t) => a.includes(t)));
        if (fuzzy) {
          actionName = fuzzy;
          aiResult.action.action = fuzzy;
        }
      }

      if (agent.allowedActions.includes(actionName)) {
        if (REQUIRE_DELETE_CONFIRMATION && DELETE_ACTIONS.has(actionName)) {
          ensureAgentMeta(agent);
          agent.pendingConfirmations[userKey] = {
            action: actionName,
            data: aiResult.action.data || {},
            createdAt: new Date().toISOString(),
          };
          const targetLabel =
            aiResult.action.data?.name || aiResult.action.data?.studentName || "the selected record(s)";
          responseText = `Please confirm deletion of ${targetLabel}. Reply YES to continue or NO to cancel.`;
        } else {
          actionResult = executeAction(actionName, aiResult.action.data || {}, currentUser);
          actionExecuted = actionName;
        }
      } else {
        actionResult = {
          success: false,
          message:
            "That looks like a different domain. This agent handles: " +
            agent.allowedActions.map((a) => a.replace(/_/g, " ")).join(", ") +
            ".",
          data: null,
        };
      }
    }

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

    if (actionResult) {
      responseText = actionResult.message;
    }

    return res.json({
      success: true,
      data: {
        response: responseText,
        action: actionExecuted,
        actionResult,
        aiRawAction: aiResult.action,
      },
    });
  } catch (error) {
    console.error("Chat Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

function getChatHistory(req, res) {
  const agents = readData("agents.json");
  const agent = agents.find((a) => a.id === parseInt(req.params.agentId, 10));
  if (!agent) return res.status(404).json({ success: false, message: "Agent not found" });
  return res.json({ success: true, data: agent.chatHistory || [] });
}

module.exports = { sendMessage, getChatHistory };
