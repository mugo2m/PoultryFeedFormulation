import { NextRequest, NextResponse } from "next/server";
import { addFeedback } from "@/lib/memory/feedbackMemory";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const comment =
      typeof body.comment === "string"
        ? body.comment.trim()
        : "";

    const userId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    const farmerName =
      typeof body.farmerName === "string"
        ? body.farmerName.trim()
        : "Farmer";

    const sessionId =
      typeof body.sessionId === "string"
        ? body.sessionId.trim()
        : "";

    const crop =
      typeof body.crop === "string"
        ? body.crop.trim()
        : "poultry";

    const country =
      typeof body.country === "string"
        ? body.country.trim()
        : "kenya";

    // Validate the comment
    if (!comment) {
      return NextResponse.json(
        {
          success: false,
          error: "Comment is required.",
        },
        { status: 400 }
      );
    }

    // Validate the user
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required.",
        },
        { status: 400 }
      );
    }

    // Save farmer feedback using the existing Firebase feedback system
    const feedbackId = await addFeedback({
      userId,

      // Connect feedback to the farmer's session/interview
      interviewId: sessionId || undefined,

      // Identify this as farmer/user feedback
      type: "user_feedback",

      // General feedback category
      category: "overall",

      // Actual farmer comment
      content: comment,

      // Additional information
      metadata: {
        topic: crop || "poultry",
        difficulty: "medium",
        questionId: undefined,
      },

      // Farmer information
      farmerName,

      country,
    } as any);

    return NextResponse.json({
      success: true,
      feedbackId,
      message: "Comment saved successfully!",
    });
  } catch (error) {
    console.error(
      "Error saving farmer comment:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save farmer comment.",
      },
      { status: 500 }
    );
  }
}