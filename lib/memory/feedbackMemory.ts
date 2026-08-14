"use server";

import { db } from "@/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import type { FeedbackEntry } from "./types";

function analyzeSentiment(
  content: string
): FeedbackEntry["metadata"]["sentiment"] {
  const positiveWords = [
    "great",
    "excellent",
    "good",
    "well",
    "improved",
    "better",
  ];

  const negativeWords = [
    "poor",
    "weak",
    "bad",
    "needs",
    "improve",
    "lack",
  ];

  const lowerContent = content.toLowerCase();

  const positiveCount = positiveWords.filter((word) =>
    lowerContent.includes(word)
  ).length;

  const negativeCount = negativeWords.filter((word) =>
    lowerContent.includes(word)
  ).length;

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";

  return "neutral";
}

export async function addFeedback(
  feedback: Omit<FeedbackEntry, "id" | "metadata" | "resolved">
): Promise<string> {
  try {
    const id = `feedback_${Date.now()}_${feedback.userId}`;

    const entry: FeedbackEntry = {
      ...feedback,
      id,
      metadata: {
        questionId: feedback.metadata?.questionId,
        topic: feedback.metadata?.topic || "General",
        difficulty: feedback.metadata?.difficulty || "medium",
        timestamp: Timestamp.now(),
        actionable: feedback.type === "ai_feedback",
        sentiment: analyzeSentiment(feedback.content),
      },
      actionsTaken: [],
      resolved: false,
    };

    // IMPORTANT:
    // db comes from firebase-admin, so it must be used with the
    // Firebase Admin Firestore API. Do NOT use collection(), doc(),
    // setDoc(), query(), where(), etc. from the client Firebase SDK.
    const feedbackRef = db
      .collection("users")
      .doc(feedback.userId)
      .collection("feedback")
      .doc(id);

    await feedbackRef.set(entry);

    console.log("📝 Added feedback:", {
      id,
      type: feedback.type,
      userId: feedback.userId,
    });

    return id;
  } catch (error) {
    console.error("Error adding feedback:", error);
    throw error;
  }
}

export async function getUserFeedback(
  userId: string,
  filters?: {
    type?: FeedbackEntry["type"];
    category?: FeedbackEntry["category"];
    resolved?: boolean;
  }
): Promise<FeedbackEntry[]> {
  try {
    const feedbackRef = db
      .collection("users")
      .doc(userId)
      .collection("feedback");

    let queryRef: FirebaseFirestore.Query = feedbackRef;

    if (filters?.type) {
      queryRef = queryRef.where("type", "==", filters.type);
    }

    if (filters?.category) {
      queryRef = queryRef.where(
        "category",
        "==",
        filters.category
      );
    }

    if (filters?.resolved !== undefined) {
      queryRef = queryRef.where(
        "resolved",
        "==",
        filters.resolved
      );
    }

    queryRef = queryRef.orderBy(
      "metadata.timestamp",
      "desc"
    );

    const snapshot = await queryRef.get();

    return snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    })) as FeedbackEntry[];
  } catch (error) {
    console.error("Error getting feedback:", error);
    return [];
  }
}

export async function getFeedbackForInterview(
  userId: string,
  interviewId: string
): Promise<FeedbackEntry[]> {
  try {
    const feedbackRef = db
      .collection("users")
      .doc(userId)
      .collection("feedback");

    const snapshot = await feedbackRef
      .where("interviewId", "==", interviewId)
      .orderBy("metadata.timestamp", "asc")
      .get();

    return snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    })) as FeedbackEntry[];
  } catch (error) {
    console.error(
      "Error getting interview feedback:",
      error
    );
    return [];
  }
}

export async function markFeedbackResolved(
  feedbackId: string,
  actionsTaken: string[] = []
): Promise<void> {
  try {
    console.warn(
      "markFeedbackResolved needs userId parameter"
    );

    console.log(
      "Would mark feedback as resolved:",
      feedbackId,
      actionsTaken
    );
  } catch (error) {
    console.error(
      "Error marking feedback resolved:",
      error
    );
    throw error;
  }
}

export async function clearUserFeedback(
  userId: string
): Promise<void> {
  try {
    console.warn(
      "Batch delete not implemented for feedback"
    );

    console.log(
      "🧹 Would clear feedback for user:",
      userId
    );
  } catch (error) {
    console.error(
      "Error clearing feedback:",
      error
    );
    throw error;
  }
}