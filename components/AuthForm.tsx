"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import {
  signIn,
  signUp,
  createPhoneAccount,
  signInWithPhone,
} from "@/lib/actions/auth.action";

import FormField from "./FormField";
import { useOfflineTranslation } from "@/lib/hooks/useOfflineTranslation";

// Country codes for African countries
const countryCodes = [
  {
    code: "+254",
    country: "Kenya",
    flag: "🇰🇪",
  },
  {
    code: "+255",
    country: "Tanzania",
    flag: "🇹🇿",
  },
  {
    code: "+256",
    country: "Uganda",
    flag: "🇺🇬",
  },
  {
    code: "+260",
    country: "Zambia",
    flag: "🇿🇲",
  },
  {
    code: "+27",
    country: "South Africa",
    flag: "🇿🇦",
  },
  {
    code: "+234",
    country: "Nigeria",
    flag: "🇳🇬",
  },
  {
    code: "+233",
    country: "Ghana",
    flag: "🇬🇭",
  },
  {
    code: "+1",
    country: "USA/Canada",
    flag: "🇺🇸",
  },
  {
    code: "+44",
    country: "UK",
    flag: "🇬🇧",
  },
];

// Email schema
const emailSignUpSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(3),
});

const emailSignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

// Phone PIN schema
const phoneSignUpSchema = z.object({
  name: z.string().min(3),
  countryCode: z.string(),
  phoneNumber: z
    .string()
    .regex(
      /^\d{6,15}$/,
      "Please enter a valid phone number"
    ),
  pin: z
    .string()
    .regex(
      /^\d{4}$/,
      "PIN must be exactly 4 digits"
    ),
});

const phoneSignInSchema = z.object({
  countryCode: z.string(),
  phoneNumber: z
    .string()
    .regex(
      /^\d{6,15}$/,
      "Please enter a valid phone number"
    ),
  pin: z
    .string()
    .regex(
      /^\d{4}$/,
      "PIN must be exactly 4 digits"
    ),
});

const AuthForm = ({
  type,
}: {
  type: FormType;
}) => {
  const router = useRouter();

  const {
    t,
  } = useOfflineTranslation();

  const [
    authMethod,
    setAuthMethod
  ] =
    useState<
      "email" | "phone"
    >("email");

  /*
   * These states are retained because
   * they are part of the original component.
   */
  const [
    karaokeText,
    setKaraokeText
  ] = useState("");

  const [
    karaokeWordIndex,
    setKaraokeWordIndex
  ] = useState(-1);

  const [
    karaokeActive,
    setKaraokeActive
  ] = useState(false);

  /*
   * Safe translation helper.
   */
  const safeT = (
    key: string,
    fallback?: string
  ): string => {
    try {
      const result = t(key);

      if (
        result &&
        typeof (result as any).then ===
          "function"
      ) {
        return (
          fallback ??
          key
        );
      }

      if (
        typeof result ===
        "string" &&
        result !== key
      ) {
        return result;
      }

      return (
        fallback ??
        key
      );
    } catch {
      return (
        fallback ??
        key
      );
    }
  };

  /*
   * ============================================================
   * SIGN-IN SUCCESS VOICE
   * ============================================================
   *
   * Translation key:
   *
   * sign_in_success_message
   *
   * Example:
   *
   * "sign_in_success_message":
   * "You have signed in to Hugos Poultry Feed Formulation."
   *
   * The message is spoken only.
   * It is NOT displayed as a toast.
   * It is NOT displayed as karaoke text.
   */
  const speakSignInSuccess =
    async (): Promise<void> => {
      const message =
        safeT(
          "sign_in_success_message",
          "You have signed in to Hugos Poultry Feed Formulation."
        );

      /*
       * Make sure no old speech is still running.
       */
      if (
        typeof window ===
          "undefined" ||
        !(
          "speechSynthesis" in
          window
        )
      ) {
        return;
      }

      window.speechSynthesis.cancel();

      /*
       * Give the browser a moment to
       * finish cancelling any previous
       * utterance.
       */
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

      utterance.rate =
        0.9;

      utterance.pitch =
        1.05;

      utterance.volume =
        1;

      /*
       * Try to use a natural-sounding
       * English voice.
       */
      const voices =
        window.speechSynthesis.getVoices();

      const preferredVoice =
        voices.find(
          (voice) =>
            /Microsoft Jenny|Microsoft Aria|Google UK English Female|Google US English Female|Samantha|Microsoft Zira/i.test(
              voice.name
            )
        );

      if (
        preferredVoice
      ) {
        utterance.voice =
          preferredVoice;
      }

      /*
       * No visible karaoke text is set.
       */
      setKaraokeText("");
      setKaraokeWordIndex(-1);
      setKaraokeActive(false);

      return new Promise<void>(
        (resolve) => {
          utterance.onend =
            () => {
              setKaraokeText("");
              setKaraokeWordIndex(-1);
              setKaraokeActive(false);

              resolve();
            };

          utterance.onerror =
            () => {
              setKaraokeText("");
              setKaraokeWordIndex(-1);
              setKaraokeActive(false);

              resolve();
            };

          window.speechSynthesis.speak(
            utterance
          );
        }
      );
    };

  /*
   * ============================================================
   * SIGN-IN PAGE GUIDANCE VOICE
   * ============================================================
   *
   * Translation key:
   *
   * sign_in_guidance
   *
   * The message is spoken automatically when
   * the sign-in page opens.
   *
   * It is voice-only.
   * No visible text is displayed.
   */
  const speakSignInGuidance =
    async (): Promise<void> => {
      const message =
        safeT(
          "sign_in_guidance",
          "Please sign in using your phone number or email. If you have no account, please create one by pressing Sign Up."
        );

      if (
        typeof window ===
          "undefined" ||
        !(
          "speechSynthesis" in
          window
        )
      ) {
        return;
      }

      /*
       * Cancel any previous speech.
       */
      window.speechSynthesis.cancel();

      /*
       * Give the browser a short moment
       * before starting the guidance.
       */
      await new Promise<void>(
        (resolve) =>
          setTimeout(
            resolve,
            300
          )
      );

      const utterance =
        new SpeechSynthesisUtterance(
          message
        );

      utterance.lang =
        "en-US";

      utterance.rate =
        0.9;

      utterance.pitch =
        1.05;

      utterance.volume =
        1;

      const voices =
        window.speechSynthesis.getVoices();

      const preferredVoice =
        voices.find(
          (voice) =>
            /Microsoft Jenny|Microsoft Aria|Google UK English Female|Google US English Female|Samantha|Microsoft Zira/i.test(
              voice.name
            )
        );

      if (
        preferredVoice
      ) {
        utterance.voice =
          preferredVoice;
      }

      /*
       * Voice only.
       * Keep all visual karaoke states empty.
       */
      setKaraokeText("");
      setKaraokeWordIndex(-1);
      setKaraokeActive(false);

      await new Promise<void>(
        (resolve) => {
          utterance.onend =
            () => {
              setKaraokeText("");
              setKaraokeWordIndex(-1);
              setKaraokeActive(false);

              resolve();
            };

          utterance.onerror =
            (error) => {
              console.error(
                "Sign-in guidance speech error:",
                error
              );

              setKaraokeText("");
              setKaraokeWordIndex(-1);
              setKaraokeActive(false);

              resolve();
            };

          window.speechSynthesis.speak(
            utterance
          );
        }
      );
    };

  /*
   * Automatically speak the guidance when
   * the sign-in page opens.
   */
  useEffect(() => {
    if (
      type !== "sign-in"
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          void speakSignInGuidance();
        },
        700
      );

    return () => {
      window.clearTimeout(
        timer
      );

      if (
        typeof window !==
          "undefined" &&
        "speechSynthesis" in
          window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, [type]);

  /*
   * ============================================================
   * PHONE MESSAGE VOICE
   * ============================================================
   *
   * Used for:
   *
   * phone_already_registered
   * phone_account_created
   *
   * Both messages are voice-only.
   * No toast or visible karaoke text is shown.
   */
  const speakPhoneMessage =
    async (
      key: string,
      fallback: string
    ): Promise<void> => {
      const message =
        safeT(
          key,
          fallback
        );

      if (
        typeof window ===
          "undefined" ||
        !(
          "speechSynthesis" in
          window
        )
      ) {
        return;
      }

      /*
       * Cancel any speech currently running.
       */
      window.speechSynthesis.cancel();

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

      utterance.rate =
        0.9;

      utterance.pitch =
        1.05;

      utterance.volume =
        1;

      /*
       * Select a natural English voice.
       */
      const voices =
        window.speechSynthesis.getVoices();

      const preferredVoice =
        voices.find(
          (voice) =>
            /Microsoft Jenny|Microsoft Aria|Google UK English Female|Google US English Female|Samantha|Microsoft Zira/i.test(
              voice.name
            )
        );

      if (
        preferredVoice
      ) {
        utterance.voice =
          preferredVoice;
      }

      /*
       * Keep all karaoke states visually empty.
       * The message is heard only.
       */
      setKaraokeText("");
      setKaraokeWordIndex(-1);
      setKaraokeActive(false);

      await new Promise<void>(
        (resolve) => {
          utterance.onend =
            () => {
              setKaraokeText("");
              setKaraokeWordIndex(-1);
              setKaraokeActive(false);

              resolve();
            };

          utterance.onerror =
            () => {
              setKaraokeText("");
              setKaraokeWordIndex(-1);
              setKaraokeActive(false);

              resolve();
            };

          window.speechSynthesis.speak(
            utterance
          );
        }
      );
    };

  // Email form
  const emailForm =
    useForm<
      z.infer<
        typeof emailSignUpSchema |
        typeof emailSignInSchema
      >
    >({
      resolver: zodResolver(
        type === "sign-up"
          ? emailSignUpSchema
          : emailSignInSchema
      ),

      defaultValues: {
        name: "",
        email: "",
        password: "",
      },
    });

  // Phone form
  const phoneForm =
    useForm<
      z.infer<
        typeof phoneSignUpSchema |
        typeof phoneSignInSchema
      >
    >({
      resolver: zodResolver(
        type === "sign-up"
          ? phoneSignUpSchema
          : phoneSignInSchema
      ),

      defaultValues: {
        name: "",
        countryCode: "+254",
        phoneNumber: "",
        pin: "",
      },
    });

  const onEmailSubmit =
    async (data: any) => {
      try {
        if (
          type === "sign-up"
        ) {
          const {
            name,
            email,
            password,
          } = data;

          const userCredential =
            await createUserWithEmailAndPassword(
              auth,
              email,
              password
            );

          const result =
            await signUp({
              uid:
                userCredential
                  .user.uid,
              name,
              email,
              password,
            });

          if (
            !result.success
          ) {
            toast.error(
              result.message
            );

            return;
          }

          toast.success(
            "Account created successfully. Please sign in."
          );

          router.push(
            "/sign-in"
          );
        } else {
          const {
            email,
            password,
          } = data;

          const userCredential =
            await signInWithEmailAndPassword(
              auth,
              email,
              password
            );

          const idToken =
            await userCredential.user.getIdToken();

          await signIn({
            email,
            idToken,
          });

          /*
           * SUCCESS:
           *
           * No visible toast.
           * Speak the translated message only.
           */
          await speakSignInSuccess();

          setTimeout(
            () =>
              (window.location.href =
                "/"),
            1500
          );
        }
      } catch (
        error: any
      ) {
        toast.error(
          error.message
        );
      }
    };

  const onPhoneSubmit =
    async (data: any) => {
      try {
        const {
          name,
          countryCode,
          phoneNumber,
          pin,
        } = data;

        const fullPhone =
          `${countryCode}${phoneNumber}`;

        if (
          type === "sign-up"
        ) {
          const result =
            await createPhoneAccount(
              {
                name,
                phone:
                  fullPhone,
                pin,
              }
            );

          if (
            !result.success
          ) {
            /*
             * PHONE NUMBER ALREADY REGISTERED
             *
             * Voice only.
             * No visible toast.
             *
             * We use the translation key
             * phone_already_registered.
             */
            const errorMessage =
              typeof result.message ===
              "string"
                ? result.message
                : "";

            const isPhoneAlreadyRegistered =
              /phone\s*number\s*already\s*registered/i.test(
                errorMessage
              ) ||
              /phone\s*already\s*registered/i.test(
                errorMessage
              );

            if (
              isPhoneAlreadyRegistered
            ) {
              await speakPhoneMessage(
                "phone_already_registered",
                "Phone number already registered"
              );

              /*
               * After the voice message has
               * finished, send the farmer to
               * the sign-in page.
               */
              router.push(
                "/sign-in"
              );

              return;
            } else {
              /*
               * Preserve all other existing
               * error behavior.
               */
              toast.error(
                result.message
              );
            }

            return;
          }

          /*
           * PHONE ACCOUNT CREATED SUCCESSFULLY
           *
           * Voice only.
           * No visible toast.
           *
           * Uses translation key:
           * phone_account_created
           */
          await speakPhoneMessage(
            "phone_account_created",
            "Phone account created successfully. Please sign in."
          );

          router.push(
            "/sign-in"
          );
        } else {
          const result =
            await signInWithPhone(
              {
                phone:
                  fullPhone,
                pin,
              }
            );

          if (
            !result.success
          ) {
            toast.error(
              result.message
            );

            return;
          }

          const userCredential =
            await signInWithEmailAndPassword(
              auth,
              result.email!,
              result.password!
            );

          const idToken =
            await userCredential.user.getIdToken();

          await signIn({
            email:
              result.email!,
            idToken,
          });

          /*
           * SUCCESS:
           *
           * No visible toast.
           * Speak the translated message only.
           */
          await speakSignInSuccess();

          setTimeout(
            () =>
              (window.location.href =
                "/"),
            1500
          );
        }
      } catch (
        error: any
      ) {
        toast.error(
          error.message
        );
      }
    };

  const isSignIn =
    type === "sign-in";

  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">

        <div className="flex flex-row gap-2 justify-center">
          <Image
            src="/logo.svg"
            alt="logo"
            height={32}
            width={38}
          />

          <h2 className="text-primary-100">
            hugos
          </h2>
        </div>

        {/*
         * The original karaoke sign-in display
         * is intentionally not rendered.
         *
         * Sign-in success is voice-only.
         */}

        <h3 className="text-center">
          Practice job interviews with AI
        </h3>

        {/* Method Selection Tabs - FIXED: Removed onValueChange */}
        <Tabs
          defaultValue="email"
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">

            <TabsTrigger
              value="email"
              onClick={() =>
                setAuthMethod(
                  "email"
                )
              }
            >
              📧 Email
            </TabsTrigger>

            <TabsTrigger
              value="phone"
              onClick={() =>
                setAuthMethod(
                  "phone"
                )
              }
            >
              📱 Phone (4-digit PIN)
            </TabsTrigger>

          </TabsList>

          {/* Email Tab Content */}
          <TabsContent value="email">

            <Form {...emailForm}>
              <form
                onSubmit={emailForm.handleSubmit(
                  onEmailSubmit
                )}
                className="space-y-6 mt-4"
              >

                {!isSignIn && (
                  <FormField
                    control={
                      emailForm.control
                    }
                    name="name"
                    label="Your Name"
                    placeholder="Your Name"
                    type="text"
                  />
                )}

                <FormField
                  control={
                    emailForm.control
                  }
                  name="email"
                  label="Your email address"
                  placeholder="Your email address"
                  type="email"
                />

                <FormField
                  control={
                    emailForm.control
                  }
                  name="password"
                  label="Enter your password"
                  placeholder="Enter your password"
                  type="password"
                />

                <Button
                  className="btn w-full"
                  type="submit"
                >
                  {isSignIn
                    ? "Sign In with Email"
                    : "Create Email Account"}
                </Button>

              </form>
            </Form>

          </TabsContent>

          {/* Phone Tab Content */}
          <TabsContent value="phone">

            <Form {...phoneForm}>
              <form
                onSubmit={phoneForm.handleSubmit(
                  onPhoneSubmit
                )}
                className="space-y-6 mt-4"
              >

                {!isSignIn && (
                  <FormField
                    control={
                      phoneForm.control
                    }
                    name="name"
                    label="Your Name"
                    placeholder="Your Name"
                    type="text"
                  />
                )}

                {/* Phone Number with Country Code */}
                <div className="space-y-2">

                  <label className="text-sm font-medium">
                    Phone Number
                  </label>

                  <div className="flex gap-2">

                    <select
                      {...phoneForm.register(
                        "countryCode"
                      )}
                      className="w-28 px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
                    >
                      {countryCodes.map(
                        (
                          country
                        ) => (
                          <option
                            key={
                              country.code
                            }
                            value={
                              country.code
                            }
                          >
                            {
                              country.flag
                            }{" "}
                            {
                              country.code
                            }
                          </option>
                        )
                      )}
                    </select>

                    <Input
                      type="tel"
                      placeholder="712345678"
                      {...phoneForm.register(
                        "phoneNumber"
                      )}
                      className="flex-1"
                      maxLength={15}
                    />

                  </div>
                </div>

                {/* 4-digit PIN */}
                <div className="space-y-2">

                  <label className="text-sm font-medium">
                    4-Digit PIN
                  </label>

                  <Input
                    type="password"
                    placeholder="3846"
                    {...phoneForm.register(
                      "pin"
                    )}
                    maxLength={4}
                    className="w-full"
                  />

                  <p className="text-xs text-gray-500">
                    Enter a 4-digit number (e.g., 3846)
                  </p>

                </div>

                <Button
                  className="btn w-full"
                  type="submit"
                >
                  {isSignIn
                    ? "Sign In with Phone"
                    : "Create Phone Account"}
                </Button>

              </form>
            </Form>

          </TabsContent>
        </Tabs>

        {/* Toggle between sign-in and sign-up */}
        <p className="text-center">

          {isSignIn
            ? "Don't have an account?"
            : "Already have an account?"}

          <Link
            href={
              !isSignIn
                ? "/sign-in"
                : "/sign-up"
            }
            className="font-bold text-user-primary ml-1"
          >
            {!isSignIn
              ? "Sign In"
              : "Sign Up"}
          </Link>

        </p>

      </div>
    </div>
  );
};

export default AuthForm;