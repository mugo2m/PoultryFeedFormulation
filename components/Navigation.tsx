
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Image as ImageIcon,
  Upload,
  LogOut,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth.action";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useOfflineTranslation } from "@/lib/hooks/useOfflineTranslation";

export default function Navigation() {
  const pathname = usePathname();

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [karaokeText, setKaraokeText] =
    useState("");

  const [karaokeWordIndex, setKaraokeWordIndex] =
    useState(-1);

  const [karaokeActive, setKaraokeActive] =
    useState(false);

  const { t } =
    useOfflineTranslation();

  // Safe translation helper
  const safeT = (
    key: string,
    params?: any
  ): string => {
    try {
      const result = t(
        key,
        params
      );

      // Handle if result is a Promise
      if (
        result &&
        typeof (result as any).then ===
          "function"
      ) {
        console.warn(
          `Translation for "${key}" returned a Promise`
        );

        return key;
      }

      return typeof result ===
        "string"
        ? result
        : String(result || "");
    } catch (e) {
      console.error(
        "Translation error for key:",
        key,
        e
      );

      return key;
    }
  };

  useEffect(() => {
    // Check if user is admin
    const checkAdmin =
      async () => {
        // Simple check - replace with your actual admin logic
        const userEmail =
          localStorage.getItem(
            "userEmail"
          );

        setIsAdmin(
          userEmail ===
            "your-email@gmail.com"
        );
      };

    checkAdmin();
  }, []);

  /**
   * Speak a message using the browser's
   * Speech Synthesis API while highlighting
   * each spoken word like karaoke.
   */
  const speakKaraokeMessage =
    async (
      message: string
    ): Promise<void> => {
      setKaraokeText(message);
      setKaraokeWordIndex(-1);
      setKaraokeActive(true);

      if (
        typeof window ===
          "undefined" ||
        !(
          "speechSynthesis" in
          window
        )
      ) {
        setKaraokeActive(false);
        return;
      }

      // Stop any speech currently playing.
      window.speechSynthesis.cancel();

      // Give the browser a short moment
      // to finish cancelling the previous utterance.
      await new Promise<void>(
        (resolve) =>
          setTimeout(
            resolve,
            100
          )
      );

      const utterance =
        new SpeechSynthesisUtterance(
          message
        );

      utterance.lang =
        "en-US";

      // Slightly slower so the farmer
      // can clearly hear the message.
      utterance.rate =
        0.9;

      utterance.pitch =
        1.05;

      utterance.volume =
        1;

      const voices =
        window.speechSynthesis.getVoices();

      // Prefer natural-sounding English voices.
      const preferredVoice =
        voices.find(
          (voice) =>
            /Microsoft Jenny|Microsoft Aria|Google UK English Female|Google US English Female|Samantha|Microsoft Zira/i.test(
              voice.name
            )
        );

      if (preferredVoice) {
        utterance.voice =
          preferredVoice;
      }

      const words =
        message.split(
          /\s+/
        );

      return new Promise<void>(
        (resolve) => {
          /**
           * onboundary fires as the speech
           * reaches individual words.
           */
          utterance.onboundary =
            (event) => {
              if (
                event.name !==
                "word"
              ) {
                return;
              }

              const spoken =
                message
                  .slice(
                    0,
                    event.charIndex
                  )
                  .trim();

              const currentIndex =
                spoken
                  ? spoken.split(
                      /\s+/
                    ).length -
                    1
                  : 0;

              setKaraokeWordIndex(
                Math.min(
                  currentIndex,
                  words.length -
                    1
                )
              );
            };

          /**
           * When the complete message
           * has been spoken.
           */
          utterance.onend =
            () => {
              setKaraokeWordIndex(
                words.length - 1
              );

              setKaraokeActive(
                false
              );
              setKaraokeText(
                ""
              );
              setKaraokeWordIndex(
                -1
              );

              resolve();
            };

          /**
           * If the browser's speech engine
           * encounters an error, don't leave
           * the UI stuck in "Speaking..."
           */
          utterance.onerror =
            (event) => {
              console.error(
                "Speech synthesis error:",
                event
              );

              setKaraokeActive(
                false
              );
              setKaraokeText(
                ""
              );
              setKaraokeWordIndex(
                -1
              );

              resolve();
            };

          window.speechSynthesis.speak(
            utterance
          );
        }
      );
    };

  /**
   * Handle farmer sign out.
   */
  const handleSignOut =
    async () => {
      try {
        // Sign out from the application.
        await signOut();

        // Get the translated sign-out message.
        // The farmer hears this message only; it is not displayed.
        const message =
          safeT(
            "sign_out_success_message",
            "You have signed out successfully. Welcome again !!"
          );

        // Speak the translated message with the existing
        // karaoke timing, but keep all text hidden.
        await speakKaraokeMessage(
          message
        );

        // Redirect to sign-in.
        window.location.href =
          "/sign-in";
      } catch (error) {
        console.error(
          "Error signing out:",
          error
        );

        toast.error(
          safeT(
            "sign_out_failed"
          )
        );

        // Still redirect to sign-in if
        // the server-side sign-out fails.
        window.location.href =
          "/sign-in";
      }
    };

  const navItems = [
    {
      href: "/",
      label: safeT("home"),
      icon: Home,
    },

    {
      href: "/ask-multimodal",
      label: safeT(
        "ask_with_images"
      ),
      icon: ImageIcon,
    },
  ];

  if (isAdmin) {
    navItems.push({
      href: "/admin/multimodal",
      label: safeT(
        "upload_documents"
      ),
      icon: Upload,
    });
  }

  return (
    <nav className="bg-white border-b border-gray-200 py-3 px-6">
      <div className="container mx-auto flex items-center justify-between">

        <div className="flex items-center gap-8">

          <Link
            href="/"
            className="text-xl font-bold text-blue-900"
          >
            🌾{" "}
            {safeT(
              "app_name"
            )}
          </Link>

          <div className="flex gap-4">
            {navItems.map(
              (item) => {
                const Icon =
                  item.icon;

                return (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      pathname ===
                      item.href
                        ? "bg-green-100 text-green-700"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />

                    {item.label}
                  </Link>
                );
              }
            )}
          </div>
        </div>

        {/* Sign out button */}
        <button
          onClick={
            handleSignOut
          }
          disabled={
            karaokeActive
          }
          className={`flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors ${
            karaokeActive
              ? "opacity-60 cursor-wait"
              : ""
          }`}
        >
          <LogOut className="w-4 h-4" />

          {safeT(
            "sign_out"
          )}
        </button>
      </div>

    </nav>
  );
}
