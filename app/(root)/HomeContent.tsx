'use client';

import { useOfflineTranslation } from '@/lib/hooks/useOfflineTranslation';
import { useEffect, useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { WifiOff } from "lucide-react";

interface HomeContentProps {
  user: any;
  farmerSessions: any[];
  recentQueries: any[];
}

export default function HomeContent({
  user,
  farmerSessions,
  recentQueries
}: HomeContentProps) {
  const { t, ready, isOnline } =
    useOfflineTranslation();

  const [
    karaokeText,
    setKaraokeText
  ] = useState("");

  const [
    karaokeTitle,
    setKaraokeTitle
  ] = useState("");

  const [
    karaokeWordIndex,
    setKaraokeWordIndex
  ] = useState(-1);

  const [
    voiceActive,
    setVoiceActive
  ] = useState(false);

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
        typeof result.then ===
          'function'
      ) {
        console.warn(
          `Translation for "${key}" returned a Promise`
        );

        return key;
      }

      return typeof result ===
        'string'
        ? result
        : String(result || '');
    } catch (e) {
      console.error(
        'Translation error for key:',
        key,
        e
      );

      return key;
    }
  };

  /*
   * ============================================================
   * KARAOKE VOICE GUIDANCE
   * ============================================================
   *
   * Translation keys used:
   *
   * start_session_guidance_title
   * start_session_guidance
   *
   * Example:
   *
   * "start_session_guidance_title":
   * "Hugos Poultry Feed Formulation"
   *
   * "start_session_guidance":
   * "Press the Start Session button to start your poultry feed formulation."
   *
   * The message:
   *
   * 1. Appears on the screen.
   * 2. Is spoken aloud.
   * 3. Highlights each word as it is spoken.
   * 4. Keeps proper spaces between words.
   * 5. Disappears completely after speech finishes.
   */

  useEffect(() => {
    if (
      !ready ||
      !user ||
      typeof window ===
        'undefined' ||
      !(
        'speechSynthesis' in
        window
      )
    ) {
      return;
    }

    const guidanceTitle =
      safeT(
        'start_session_guidance_title'
      );

    const guidanceMessage =
      safeT(
        'start_session_guidance'
      );

    /*
     * If translations are missing, don't display
     * the translation key itself to the farmer.
     */
    if (
      !guidanceMessage ||
      guidanceMessage ===
        'start_session_guidance'
    ) {
      console.warn(
        'Missing translation value for start_session_guidance'
      );

      return;
    }

    if (
      !guidanceTitle ||
      guidanceTitle ===
        'start_session_guidance_title'
    ) {
      console.warn(
        'Missing translation value for start_session_guidance_title'
      );

      return;
    }

    /*
     * Split using whitespace so that every word remains
     * separated correctly in the karaoke display.
     */
    const words =
      guidanceMessage
        .trim()
        .split(/\s+/);

    /*
     * Show the translated title and message.
     */
    setKaraokeTitle(
      guidanceTitle
    );

    setKaraokeText(
      guidanceMessage
    );

    setKaraokeWordIndex(
      -1
    );

    setVoiceActive(
      false
    );

    /*
     * Start speech after a short delay.
     *
     * This gives the page time to render the message
     * before the browser begins speaking.
     */
    const timer =
      window.setTimeout(
        () => {
          /*
           * Cancel any speech that might already
           * be running.
           */
          window.speechSynthesis.cancel();

          /*
           * Some browsers load voices asynchronously.
           * Get the available voices now.
           */
          let voices =
            window.speechSynthesis.getVoices();

          /*
           * Preferred natural English voices.
           */
          const findPreferredVoice =
            () => {
              voices =
                window.speechSynthesis.getVoices();

              return voices.find(
                (voice) =>
                  /Microsoft Jenny|Microsoft Aria|Google UK English Female|Google US English Female|Samantha|Microsoft Zira/i.test(
                    voice.name
                  )
              );
            };

          const speak =
            () => {
              const utterance =
                new SpeechSynthesisUtterance(
                  guidanceMessage
                );

              utterance.lang =
                'en-US';

              /*
               * Slightly slower so the farmer can
               * clearly hear the instruction.
               */
              utterance.rate =
                0.9;

              utterance.pitch =
                1.05;

              utterance.volume =
                1;

              const preferredVoice =
                findPreferredVoice();

              if (
                preferredVoice
              ) {
                utterance.voice =
                  preferredVoice;
              }

              /*
               * Voice is now active.
               */
              setVoiceActive(
                true
              );

              setKaraokeWordIndex(
                -1
              );

              /*
               * Karaoke word tracking.
               *
               * Chrome and Edge normally fire
               * the "word" boundary event.
               */
              utterance.onboundary =
                (
                  event
                ) => {
                  if (
                    event.name !==
                    'word'
                  ) {
                    return;
                  }

                  /*
                   * Find the portion of the sentence
                   * that has already been spoken.
                   */
                  const spoken =
                    guidanceMessage
                      .slice(
                        0,
                        event.charIndex
                      )
                      .trim();

                  /*
                   * Calculate the current word.
                   */
                  const currentIndex =
                    spoken
                      ? spoken
                          .split(
                            /\s+/
                          )
                          .length -
                        1
                      : 0;

                  /*
                   * Highlight the current word.
                   */
                  setKaraokeWordIndex(
                    Math.min(
                      currentIndex,
                      words.length -
                        1
                    )
                  );
                };

              /*
               * Speech finished.
               *
               * IMPORTANT:
               * Remove the entire karaoke message.
               */
              utterance.onend =
                () => {
                  setVoiceActive(
                    false
                  );

                  setKaraokeWordIndex(
                    -1
                  );

                  setKaraokeText(
                    ''
                  );

                  setKaraokeTitle(
                    ''
                  );
                };

              /*
               * If speech encounters an error,
               * also remove the karaoke message.
               */
              utterance.onerror =
                (
                  event
                ) => {
                  console.error(
                    'Speech synthesis error:',
                    event
                  );

                  setVoiceActive(
                    false
                  );

                  setKaraokeWordIndex(
                    -1
                  );

                  setKaraokeText(
                    ''
                  );

                  setKaraokeTitle(
                    ''
                  );
                };

              /*
               * Start speaking.
               */
              window.speechSynthesis.speak(
                utterance
              );
            };

          /*
           * If voices are already available,
           * speak immediately.
           */
          if (
            voices.length >
            0
          ) {
            speak();
          } else {
            /*
             * Otherwise wait for voiceschanged.
             */
            const handleVoicesChanged =
              () => {
                window.speechSynthesis.removeEventListener(
                  'voiceschanged',
                  handleVoicesChanged
                );

                speak();
              };

            window.speechSynthesis.addEventListener(
              'voiceschanged',
              handleVoicesChanged
            );

            /*
             * Safety fallback in case the browser
             * doesn't fire voiceschanged.
             */
            window.setTimeout(
              () => {
                window.speechSynthesis.removeEventListener(
                  'voiceschanged',
                  handleVoicesChanged
                );

                if (
                  !voiceActive
                ) {
                  speak();
                }
              },
              1000
            );
          }
        },
        700
      );

    /*
     * Cleanup when farmer leaves page
     * or component is destroyed.
     */
    return () => {
      window.clearTimeout(
        timer
      );

      window.speechSynthesis.cancel();

      setVoiceActive(
        false
      );
    };
  }, [
    ready,
    user
  ]);

  // Helper function to format date from string or Firestore Timestamp
  const formatSessionDate = (
    createdAt: any
  ): string => {
    if (!createdAt)
      return 'Date unknown';

    try {
      let date: Date;

      // Check if it's a Firestore Timestamp (has toDate method)
      if (
        createdAt.toDate &&
        typeof createdAt.toDate ===
          'function'
      ) {
        date =
          createdAt.toDate();
      }

      // Check if it's a string
      else if (
        typeof createdAt ===
        'string'
      ) {
        date =
          new Date(
            createdAt
          );
      }

      // Check if it's a number (timestamp)
      else if (
        typeof createdAt ===
        'number'
      ) {
        date =
          new Date(
            createdAt
          );
      }

      else {
        return 'Invalid Date';
      }

      // Check if date is valid
      if (
        isNaN(
          date.getTime()
        )
      ) {
        return 'Invalid Date';
      }

      // Format as DD/MM/YYYY
      return date.toLocaleDateString(
        'en-GB'
      );
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Show loading while translations are loading
  if (!ready) {
    return (
      <LoadingSpinner
        message="Loading your farm dashboard..."
      />
    );
  }

  if (!user) {
    return (
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">

          <h2 className="text-3xl font-bold text-green-800">
            🌾{" "}
            {safeT(
              'hero_title'
            )}
          </h2>

          <p className="text-lg text-gray-700">
            {safeT(
              'hero_description'
            )}
          </p>

          <Button
            asChild
            className="bg-green-600 hover:bg-green-700 text-white max-sm:w-full"
          >
            <Link href="/sign-in">
              {safeT(
                'sign_in'
              )}
            </Link>
          </Button>

        </div>

        <Image
          src="/farmer-hero.jpg"
          alt={safeT(
            'hero_image_alt'
          )}
          width={400}
          height={400}
          className="max-sm:hidden rounded-lg shadow-lg object-cover"
        />
      </section>
    );
  }

  const hasPastSessions =
    farmerSessions.length >
    0;

  return (
    <>
      {/* ============================================================
          KARAOKE VOICE GUIDANCE
          ============================================================ */}

      {karaokeText && (
        <div
          className="mb-6 rounded-xl border-2 border-green-200 bg-green-50 p-5 shadow-sm"
          aria-live="polite"
          aria-label={`${karaokeTitle}. ${karaokeText}`}
        >

          {/* Translation key:
              start_session_guidance_title
          */}
          <div className="text-sm font-semibold text-green-800 mb-2">
            🎤{" "}
            {karaokeTitle}
          </div>

          {/* Translation key:
              start_session_guidance
          */}
          <div className="text-lg leading-8 font-medium">

            {karaokeText
              .trim()
              .split(/\s+/)
              .map(
                (
                  word,
                  index
                ) => (
                  <span
                    key={`${word}-${index}`}
                    className={`
                      mr-1
                      inline-block
                      transition-all
                      duration-150
                      ${
                        index ===
                        karaokeWordIndex
                          ? 'scale-110 font-bold text-green-700'
                          : index <
                              karaokeWordIndex
                            ? 'text-green-600'
                            : 'text-gray-600'
                      }
                    `}
                  >
                    {word}
                  </span>
                )
              )}

          </div>

          {voiceActive && (
            <div className="mt-2 text-xs text-green-700">
              🔊{" "}
              {safeT(
                'speaking'
              )}
            </div>
          )}

        </div>
      )}

      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="mb-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 flex items-center gap-2">

          <WifiOff className="w-5 h-5 text-yellow-600" />

          <p className="text-sm text-yellow-800">
            {safeT(
              'offline_mode'
            ) ||
              "You're offline. Using cached translations."}
          </p>

        </div>
      )}

      {/* Hero Section */}
      <section className="card-cta bg-gradient-to-r from-green-50 to-emerald-50">

        <div className="flex flex-col gap-6 max-w-lg">

          <h2 className="text-3xl font-bold text-green-800">
            🌾{" "}
            {safeT(
              'ask_anything_title'
            )}
          </h2>

          <p className="text-lg text-gray-700">
            {safeT(
              'ask_anything_description'
            )}
          </p>

          <Button
            asChild
            className="bg-green-600 hover:bg-green-700 text-white max-sm:w-full"
          >
            <Link href="/generate">
              🌱{" "}
              {safeT(
                'start_session'
              )}
            </Link>
          </Button>

        </div>

        <Image
          src="/farmer-smartphone.jpg"
          alt={safeT(
            'farmer_phone_alt'
          )}
          width={400}
          height={400}
          className="max-sm:hidden rounded-lg shadow-lg object-cover"
          loading="eager"
        />

      </section>

      {/* Past Sessions Section */}
      <section className="flex flex-col gap-6 mt-8">

        <h2 className="text-2xl font-semibold">
          📋{" "}
          {safeT(
            'farm_sessions'
          )}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {hasPastSessions ? (
            farmerSessions.map(
              (
                session
              ) => (
                <div
                  key={
                    session.id
                  }
                  className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all"
                >

                  <div className="flex items-center gap-2 mb-3">

                    <span className="text-2xl">
                      🌾
                    </span>

                    <div>

                      <h3 className="font-semibold text-gray-800 capitalize">
                        {session.feedName ||
                          session.crops?.join(
                            ", "
                          ) ||
                          safeT(
                            'mixed_crops'
                          )}
                      </h3>

                      <p className="text-xs text-gray-500">
                        {
                          session.county
                        }

                        {session.subCounty
                          ? `, ${session.subCounty}`
                          : ""}
                      </p>

                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">

                    <div>

                      <span className="text-gray-500">
                        {safeT(
                          'farm_size'
                        )}
                        :
                      </span>

                      <span className="ml-1 font-medium">
                        {session.totalFarmSize ||
                          session.cultivatedAcres ||
                          session.acres ||
                          "?"}{" "}
                        {safeT(
                          'acres'
                        )}
                      </span>

                    </div>

                    <div>

                      <span className="text-gray-500">
                        {safeT(
                          'cattle'
                        )}
                        :
                      </span>

                      <span className="ml-1 font-medium">
                        {session.cattle ||
                          0}
                      </span>

                    </div>

                  </div>

                  {/* Display warnings if they exist */}
                  {session.metadata?.warnings && (
                    <div className="mt-2 mb-2 space-y-1">

                      {session.metadata.warnings.yield?.map(
                        (
                          warning: string,
                          i: number
                        ) => (
                          <p
                            key={`yield-${i}`}
                            className="text-xs text-amber-600 flex items-start gap-1"
                          >
                            <span>
                              ⚠️
                            </span>

                            <span>
                              {
                                warning
                              }
                            </span>

                          </p>
                        )
                      )}

                      {session.metadata.warnings.price?.map(
                        (
                          warning: string,
                          i: number
                        ) => (
                          <p
                            key={`price-${i}`}
                            className="text-xs text-amber-600 flex items-start gap-1"
                          >
                            <span>
                              ⚠️
                            </span>

                            <span>
                              {
                                warning
                              }
                            </span>

                          </p>
                        )
                      )}

                      {session.metadata.warnings.spacing?.map(
                        (
                          warning: string,
                          i: number
                        ) => (
                          <p
                            key={`spacing-${i}`}
                            className="text-xs text-amber-600 flex items-start gap-1"
                          >
                            <span>
                              ⚠️
                            </span>

                            <span>
                              {
                                warning
                              }
                            </span>

                          </p>
                        )
                      )}

                    </div>
                  )}

                  {session.id ===
                    farmerSessions[0]
                      ?.id &&
                    recentQueries.length >
                      0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">

                        <p className="text-xs text-gray-500 mb-2">
                          {safeT(
                            'recent_questions'
                          )}
                          :
                        </p>

                        {recentQueries.map(
                          (
                            q,
                            i
                          ) => (
                            <p
                              key={i}
                              className="text-sm text-gray-700 truncate"
                            >
                              "
                              {q.question.substring(
                                0,
                                30
                              )}
                              ..."
                            </p>
                          )
                        )}

                      </div>
                    )}

                  <div className="mt-4 flex justify-between items-center">

                    <span className="text-xs text-gray-400">
                      {formatSessionDate(
                        session.createdAt
                      )}
                    </span>

                    <Link
                      href={`/interview/${session.id}`}
                      className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors"
                    >
                      {safeT(
                        'ask_more'
                      )}{" "}
                      →
                    </Link>

                  </div>

                </div>
              )
            )
          ) : (
            <div className="col-span-3 text-center py-8 bg-gray-50 rounded-lg">

              <p className="text-gray-500">
                {safeT(
                  'no_sessions'
                )}
              </p>

              <Link
                href="/generate"
                className="text-green-600 hover:text-green-700 mt-2 inline-block"
              >
                🌾{" "}
                {safeT(
                  'start_first_session'
                )}
              </Link>

            </div>
          )}

        </div>

      </section>

      {/* Knowledge Base Stats */}
      <section className="flex flex-col gap-6 mt-8 bg-blue-50 p-6 rounded-xl">

        <h2 className="text-2xl font-semibold">
          📚{" "}
          {safeT(
            'knowledge_base'
          )}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          <div className="bg-white p-4 rounded-lg text-center">

            <div className="text-3xl font-bold text-green-600">
              50+
            </div>

            <div className="text-sm text-gray-600">
              {safeT(
                'crop_guides'
              )}
            </div>

          </div>

          <div className="bg-white p-4 rounded-lg text-center">

            <div className="text-3xl font-bold text-green-600">
              100+
            </div>

            <div className="text-sm text-gray-600">
              {safeT(
                'disease_images'
              )}
            </div>

          </div>

          <div className="bg-white p-4 rounded-lg text-center">

            <div className="text-3xl font-bold text-green-600">
              24/7
            </div>

            <div className="text-sm text-gray-600">
              {safeT(
                'voice_access'
              )}
            </div>

          </div>

          <div className="bg-white p-4 rounded-lg text-center">

            <div className="text-3xl font-bold text-green-600">
              {safeT(
                'free'
              )}
            </div>

            <div className="text-sm text-gray-600">
              {safeT(
                'for_farmers'
              )}
            </div>

          </div>

        </div>

      </section>

      {/* How It Works – Text color fixed to dark blue */}
      <section className="flex flex-col gap-6 mt-8">

        <h2 className="text-2xl font-semibold text-blue-900">
          🎯{" "}
          {safeT(
            'how_it_works'
          )}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-white p-5 rounded-lg border border-gray-200">

            <div className="text-3xl mb-2">
              1️⃣
            </div>

            <h3 className="font-semibold text-blue-800 mb-1">
              {safeT(
                'step1_title'
              )}
            </h3>

            <p className="text-sm text-blue-700">
              {safeT(
                'step1_desc'
              )}
            </p>

          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200">

            <div className="text-3xl mb-2">
              2️⃣
            </div>

            <h3 className="font-semibold text-blue-800 mb-1">
              {safeT(
                'step2_title'
              )}
            </h3>

            <p className="text-sm text-blue-700">
              {safeT(
                'step2_desc'
              )}
            </p>

          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200">

            <div className="text-3xl mb-2">
              3️⃣
            </div>

            <h3 className="font-semibold text-blue-800 mb-1">
              {safeT(
                'step3_title'
              )}
            </h3>

            <p className="text-sm text-blue-700">
              {safeT(
                'step3_desc'
              )}
            </p>

          </div>

        </div>

      </section>
    </>
  );
}