import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { Helmet } from "react-helmet-async";
import { Zap, CheckCircle2, Loader2, XCircle, MailX, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "already" | "error" | "resubscribed";

export default function UnsubscribePage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const resubscribe = params.get("resubscribe") === "1";

  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const action = resubscribe ? "resubscribe" : "unsubscribe";

    fetch(`/api/email-preferences/${action}?token=${encodeURIComponent(token)}`, {
      method: "POST",
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setEmail(data.email ?? "");
          setStatus(resubscribe ? "resubscribed" : data.alreadyUnsubscribed ? "already" : "success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token, resubscribe]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <Helmet>
        <title>{resubscribe ? "Resubscribed" : "Unsubscribed"} - GTM Champion</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-white">
            <Zap className="h-6 w-6 fill-current" />
            GTM Champion
          </Link>
        </div>

        <div className="px-8 py-10 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mx-auto" />
              <p className="text-slate-600">Just a moment…</p>
            </>
          )}

          {status === "success" && (
            <>
              <MailX className="h-12 w-12 text-slate-400 mx-auto" />
              <h1 className="text-xl font-bold text-slate-900">You've been unsubscribed</h1>
              <p className="text-slate-600 text-sm leading-relaxed">
                {email ? (
                  <><strong>{email}</strong> will no longer receive marketing emails from GTM Champion.</>
                ) : (
                  "You'll no longer receive marketing emails from GTM Champion."
                )}
              </p>
              <p className="text-slate-500 text-xs">
                Changed your mind?{" "}
                <a
                  href={`/unsubscribe?token=${encodeURIComponent(token ?? "")}&resubscribe=1`}
                  className="text-indigo-600 underline underline-offset-2"
                >
                  Re-subscribe
                </a>
              </p>
            </>
          )}

          {status === "already" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-slate-400 mx-auto" />
              <h1 className="text-xl font-bold text-slate-900">Already unsubscribed</h1>
              <p className="text-slate-600 text-sm">
                This address is already unsubscribed from GTM Champion emails.
              </p>
              <p className="text-slate-500 text-xs">
                Changed your mind?{" "}
                <a
                  href={`/unsubscribe?token=${encodeURIComponent(token ?? "")}&resubscribe=1`}
                  className="text-indigo-600 underline underline-offset-2"
                >
                  Re-subscribe
                </a>
              </p>
            </>
          )}

          {status === "resubscribed" && (
            <>
              <MailCheck className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-bold text-slate-900">You're back!</h1>
              <p className="text-slate-600 text-sm leading-relaxed">
                {email ? (
                  <><strong>{email}</strong> will receive GTM Champion emails again.</>
                ) : (
                  "You'll receive GTM Champion emails again."
                )}
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-400 mx-auto" />
              <h1 className="text-xl font-bold text-slate-900">Link not valid</h1>
              <p className="text-slate-600 text-sm">
                This unsubscribe link has expired or isn't valid. Log in and manage your email preferences from Account Settings.
              </p>
            </>
          )}
        </div>

        <div className="px-8 pb-8 text-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Back to GTM Champion</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
