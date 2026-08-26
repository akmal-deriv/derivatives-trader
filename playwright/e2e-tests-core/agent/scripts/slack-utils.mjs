/**
 * Shared Slack posting and candidate Slack-thread extraction helpers.
 */
import https from "node:https";

const SLACK_RESPONSE_MAX_BYTES = 1_000_000;
const SLACK_REQUEST_TIMEOUT_MS = 15_000;

const slackApiRequest = ({ token, url, method = "GET", body }) =>
  new Promise((resolve, reject) => {
    let settled = false;
    let responseBytes = 0;
    const requestBody = body === undefined ? null : JSON.stringify(body);
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    };
    if (requestBody !== null) {
      headers["Content-Length"] = Buffer.byteLength(requestBody);
    }

    const req = https.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          if (settled) return;
          responseBytes += Buffer.isBuffer(chunk) ? chunk.byteLength : Buffer.byteLength(chunk);
          if (responseBytes > SLACK_RESPONSE_MAX_BYTES) {
            settled = true;
            reject(new Error("slack_response_too_large"));
            req.destroy();
            return;
          }
          responseBody += chunk;
        });
        res.on("end", () => {
          if (settled) return;
          try {
            const parsed = JSON.parse(responseBody);
            if (!parsed.ok) {
              settled = true;
              reject(new Error(parsed.error || "unknown_slack_error"));
              return;
            }
            settled = true;
            resolve(parsed);
          } catch (error) {
            settled = true;
            reject(error);
          }
        });
        res.on("error", (error) => {
          if (settled) return;
          settled = true;
          reject(error);
        });
      },
    );
    req.setTimeout(SLACK_REQUEST_TIMEOUT_MS, () => {
      if (settled) return;
      settled = true;
      reject(new Error("slack_request_timeout"));
      req.destroy();
    });
    req.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    if (requestBody !== null) {
      req.write(requestBody);
    }
    req.end();
  });

export const postSlackMessage = ({ token, payload }) =>
  slackApiRequest({
    token,
    url: "https://slack.com/api/chat.postMessage",
    method: "POST",
    body: payload,
  });

export const getSlackPermalink = async ({ token, channel, messageTs }) => {
  const url = new URL("https://slack.com/api/chat.getPermalink");
  url.searchParams.set("channel", channel);
  url.searchParams.set("message_ts", messageTs);

  const parsed = await slackApiRequest({ token, url });
  return parsed.permalink || "";
};

export const uniqueSlackThreadsFromCandidateFile = async (candidateFile) => {
  const fs = await import("node:fs");
  const raw = JSON.parse(fs.readFileSync(candidateFile, "utf8"));
  const candidates = Array.isArray(raw.candidates) ? raw.candidates : [];
  const seen = new Set();

  return candidates
    .map((candidate) => candidate.slackThread)
    .filter((thread) => thread?.channel && thread?.threadTs)
    .filter((thread) => {
      const key = `${thread.channel}:${thread.threadTs}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};
