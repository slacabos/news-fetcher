import axios from "axios";
import { useState } from "react";
import { slackApi } from "../services/api";

export const useSlackPost = () => {
  const [slackPosting, setSlackPosting] = useState(false);
  const [slackMessage, setSlackMessage] = useState("");
  const [slackError, setSlackError] = useState("");

  const postToSlack = async (summaryId: number) => {
    try {
      setSlackPosting(true);
      setSlackError("");
      setSlackMessage("Posting to Slack...");

      const result = await slackApi.sendSummary(summaryId);

      if (result.success) {
        setSlackMessage("✅ Posted to Slack successfully!");
        setTimeout(() => setSlackMessage(""), 3000);
      } else if (result.alreadyPosted) {
        setSlackError("This summary has already been posted to Slack");
      } else {
        setSlackError(result.error || "Failed to post to Slack");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data as
          | {
              success?: boolean;
              error?: string;
              alreadyPosted?: boolean;
            }
          | undefined;

        if (responseData?.alreadyPosted) {
          setSlackError("This summary has already been posted to Slack");
        } else if (responseData?.error) {
          setSlackError(responseData.error);
        } else {
          setSlackError(
            "Failed to post to Slack. Make sure Slack integration is enabled."
          );
        }
      } else {
        setSlackError(
          "Failed to post to Slack. Make sure Slack integration is enabled."
        );
      }
      console.error(err);
    } finally {
      setSlackPosting(false);
    }
  };

  return {
    slackPosting,
    slackMessage,
    slackError,
    postToSlack,
  };
};
