/**
 * Store submission, verification, claims and applications - Member 3 (Store Owner Portal).
 * Wireframes: W09 (add store, claim), W10 (my applications). Requirements: FR10, FR11, FR13.
 *
 *   AddStorePage            /portal/stores/new           three-step submission
 *   ClaimStorePage          /portal/claim/:storeId       claim an unowned listing
 *   ApplicationsPage        /portal/applications         follow-up list
 *   ApplicationDetailPage   /portal/applications/:appId  status, feedback, resubmit, withdraw
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleCheck,
  ClipboardList,
  Clock,
  FileText,
  Globe,
  Mail,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import type { AppData, Application, OwnershipEvidence, Store } from "../lib/types";
import { getData, nextNumber, update, useData } from "../lib/store";
import { getCategory, isPublicStore } from "../lib/selectors";
import { cn, formatDate, hostname, isValidEmail, plural, timeAgo } from "../lib/format";
import { useDocumentTitle } from "../lib/hooks";
import { Alert, Badge, Button, Card, Checkbox, Container, EmptyState, Field, Input, Modal, Segmented, Select, TextArea, useToast } from "../ui/kit";
import { StoreLogo } from "../ui/shared";
import {
  ApprovalBadge,
  NotYoursState,
  PortalPage,
  StoreDetailsFields,
  emptyStoreDetails,
  fakeRequest,
  findDuplicate,
  notifyAdmins,
  ownerApplications,
  parseKeywords,
  storeToValues,
  useOwner,
  validateStoreDetails,
  type StoreDetailsErrors,
  type StoreDetailsValues,
} from "./owner";

/* ==================================================================== */
/* Ownership evidence (multi-step verification)                         */
/* ==================================================================== */

const MAX_FILE = 5 * 1024 * 1024;
const FILE_TYPES = [".pdf", ".png", ".jpg", ".jpeg"];

export const emptyEvidence = (): OwnershipEvidence => ({
  method: "registration",
  regNumber: "",
  fileName: "",
  fileSize: 0,
  dnsVerified: false,
  emailVerified: "",
  notes: "",
});

type EvidenceErrors = Partial<Record<"regNumber" | "file" | "email" | "dns" | "notes", string>>;

/** Each method needs its own proof: registration number + document, a business email, or a DNS record. */
export function validateEvidence(ev: OwnershipEvidence): EvidenceErrors {
  const e: EvidenceErrors = {};
  if (ev.method === "registration") {
    if (!/^\d{10}$/.test(ev.regNumber.trim())) e.regNumber = "The commercial registration number has exactly 10 digits.";
    if (!ev.fileName) e.file = "Upload the registration certificate (PDF, PNG or JPG, up to 5 MB).";
  } else if (ev.method === "email") {
    if (!ev.emailVerified) e.email = "Verify an email address on your store’s domain first.";
  } else if (!ev.dnsVerified) {
    e.dns = "Add the TXT record and press Check DNS.";
  }
  if (ev.notes.length > 300) e.notes = "Keep the notes under 300 characters.";
  return e;
}

const methodLabel: Record<OwnershipEvidence["method"], string> = {
  registration: "Commercial registration",
  email: "Business email",
  dns: "DNS record",
};

const dnsToken = (host: string) => `dealfinder-verify=${(host || "store").replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase()}-${host.length * 7 + 1031}`;

/** The proof-of-ownership step. `host` is the store's website, used for the email and DNS checks. */
export function EvidenceFields({
  value,
  onChange,
  errors,
  host,
}: {
  value: OwnershipEvidence;
  onChange: (patch: Partial<OwnershipEvidence>) => void;
  errors: EvidenceErrors;
  host: string;
}) {
  const toast = useToast();
  const [email, setEmail] = useState(value.emailVerified);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | "dns" | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const sendCode = async () => {
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    if (!isValidEmail(email)) return setEmailError("Enter a valid email address.");
    if (!host || !(domain === host || domain.endsWith(`.${host}`))) return setEmailError(`Use an address ending in @${host || "your-store-domain"}, so we know you control the website.`);
    setEmailError(null);
    setBusy("send");
    await fakeRequest(700);
    const generated = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(generated);
    setBusy(null);
    // Prototype only: there is no mail server, so the code is shown in a toast.
    toast({ tone: "brand", title: `Code sent to ${email}`, description: `Prototype: your code is ${generated}`, duration: 12000 });
  };

  const verifyCode = async () => {
    setBusy("verify");
    await fakeRequest(500);
    setBusy(null);
    if (code.trim() !== sentCode) return setEmailError("That code is not correct. Check the email and try again.");
    setEmailError(null);
    onChange({ emailVerified: email.trim().toLowerCase() });
    toast({ title: "Email verified" });
  };

  const checkDns = async () => {
    setBusy("dns");
    await fakeRequest(1200);
    setBusy(null);
    onChange({ dnsVerified: true });
    toast({ title: "DNS record found", description: `${host} is verified.` });
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!FILE_TYPES.includes(ext)) return setFileError("Only PDF, PNG or JPG files are accepted.");
    if (file.size > MAX_FILE) return setFileError("The file is larger than 5 MB. Please upload a smaller copy.");
    setFileError(null);
    onChange({ fileName: file.name, fileSize: file.size });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold">How do you want to prove ownership?</p>
        <Segmented<OwnershipEvidence["method"]>
          className="mt-2 flex-col sm:flex-row"
          label="Verification method"
          value={value.method}
          onChange={(method) => onChange({ method })}
          options={[
            { value: "registration", label: "Commercial registration" },
            { value: "email", label: "Business email" },
            { value: "dns", label: "DNS record" },
          ]}
        />
      </div>

      {value.method === "registration" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Commercial registration (CR) number" htmlFor="ev-reg" required error={errors.regNumber} hint="10 digits, as printed on the certificate.">
            <Input
              id="ev-reg"
              inputMode="numeric"
              maxLength={10}
              value={value.regNumber}
              onChange={(e) => onChange({ regNumber: e.target.value.replace(/\D/g, "") })}
              invalid={!!errors.regNumber}
            />
          </Field>
          <Field label="Registration certificate" htmlFor="ev-file" required error={fileError ?? errors.file} hint="PDF, PNG or JPG, up to 5 MB.">
            {value.fileName ? (
              <div className="flex h-11 items-center gap-2 rounded-xl border border-ok/40 bg-ok-soft px-3 text-sm">
                <FileText className="size-4 shrink-0 text-ok" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{value.fileName}</span>
                <span className="text-xs text-subtle">{(value.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                <button type="button" className="text-xs font-semibold text-bad hover:underline" onClick={() => onChange({ fileName: "", fileSize: 0 })}>
                  Remove
                </button>
              </div>
            ) : (
              <label
                htmlFor="ev-file"
                className={cn(
                  "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-surface-2 text-sm font-semibold text-muted hover:border-brand-text hover:text-brand-text",
                  fileError || errors.file ? "border-bad" : "border-line-strong",
                )}
              >
                <Upload className="size-4" aria-hidden />
                Choose a file
                <input id="ev-file" type="file" accept={FILE_TYPES.join(",")} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            )}
          </Field>
        </div>
      )}

      {value.method === "email" && (
        <div className="space-y-4">
          {value.emailVerified ? (
            <Alert tone="ok" title="Email verified">
              {value.emailVerified}{" "}
              <button
                type="button"
                className="ml-1 font-semibold underline"
                onClick={() => {
                  onChange({ emailVerified: "" });
                  setSentCode(null);
                  setCode("");
                }}
              >
                Use another address
              </button>
            </Alert>
          ) : (
            <>
              <Field
                label="Email on your store’s domain"
                htmlFor="ev-email"
                required
                error={emailError ?? errors.email}
                hint={`We send a 6-digit code to an address like info@${host || "your-store-domain"}.`}
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="ev-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!(emailError ?? errors.email)} placeholder={`info@${host || "mystore.sa"}`} />
                  <Button onClick={sendCode} loading={busy === "send"} icon={<Mail className="size-4" />} className="shrink-0">
                    {sentCode ? "Send again" : "Send code"}
                  </Button>
                </div>
              </Field>
              {sentCode && (
                <Field label="Verification code" htmlFor="ev-code" required>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input id="ev-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="6 digits" />
                    <Button variant="primary" onClick={verifyCode} loading={busy === "verify"} disabled={code.length !== 6} className="shrink-0">
                      Verify
                    </Button>
                  </div>
                </Field>
              )}
            </>
          )}
        </div>
      )}

      {value.method === "dns" && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Add this TXT record to <strong className="text-fg">{host || "your domain"}</strong> in your domain provider’s settings, then press Check DNS. Changes can take a few minutes.
          </p>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface-2 p-4 font-mono text-sm">
            <p>
              <span className="text-subtle">Type:</span> TXT
            </p>
            <p>
              <span className="text-subtle">Host:</span> @
            </p>
            <p className="whitespace-nowrap">
              <span className="text-subtle">Value:</span> {dnsToken(host)}
            </p>
          </div>
          {value.dnsVerified ? (
            <Alert tone="ok" title="DNS record found">
              Ownership of {host} is confirmed.
            </Alert>
          ) : (
            <>
              <Button onClick={checkDns} loading={busy === "dns"} icon={<Globe className="size-4" />} disabled={!host}>
                Check DNS
              </Button>
              {errors.dns && (
                <p role="alert" className="text-sm text-bad">
                  {errors.dns}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <Field label="Notes for the reviewer" htmlFor="ev-notes" error={errors.notes} hint={`Optional, ${value.notes.length}/300.`}>
        <TextArea id="ev-notes" value={value.notes} onChange={(e) => onChange({ notes: e.target.value })} maxLength={300} className="min-h-20" />
      </Field>
    </div>
  );
}

/** Read-only evidence summary for the review step and the application page. */
function EvidenceSummary({ ev }: { ev: OwnershipEvidence }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-subtle">Method</dt>
        <dd className="mt-0.5 font-medium">{methodLabel[ev.method]}</dd>
      </div>
      {ev.method === "registration" && (
        <>
          <div>
            <dt className="text-subtle">CR number</dt>
            <dd className="mt-0.5 font-mono">{ev.regNumber || "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-subtle">Document</dt>
            <dd className="mt-0.5 flex items-center gap-1.5">
              <FileText className="size-4 text-muted" aria-hidden />
              {ev.fileName || "Not uploaded"}
            </dd>
          </div>
        </>
      )}
      {ev.method === "email" && (
        <div>
          <dt className="text-subtle">Verified email</dt>
          <dd className="mt-0.5">{ev.emailVerified || "Not verified"}</dd>
        </div>
      )}
      {ev.method === "dns" && (
        <div>
          <dt className="text-subtle">DNS record</dt>
          <dd className="mt-0.5">{ev.dnsVerified ? "Found" : "Not checked"}</dd>
        </div>
      )}
      {ev.notes && (
        <div className="sm:col-span-2">
          <dt className="text-subtle">Notes</dt>
          <dd className="mt-0.5 whitespace-pre-line">{ev.notes}</dd>
        </div>
      )}
    </dl>
  );
}

/* ==================================================================== */
/* Add a new store (W09-1 to W09-4, FR10)                                */
/* ==================================================================== */

const STEPS = ["Store details", "Ownership", "Review and submit"];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                done ? "bg-ok text-white" : current ? "bg-brand text-white" : "bg-surface-3 text-muted",
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn("hidden text-sm font-semibold sm:block", current ? "text-fg" : "text-muted")}>{label}</span>
            <span className="sr-only">{done ? "(done)" : current ? "(current step)" : ""}</span>
            {i < STEPS.length - 1 && <span className={cn("h-px flex-1", done ? "bg-ok" : "bg-line")} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

/** Unique, readable store id from the name: "Nest Kids" -> "nest-kids" (or "nest-kids-2"). */
function storeSlug(data: AppData, name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "store";
  let id = base;
  for (let n = 2; data.stores.some((s) => s.id === id); n++) id = `${base}-${n}`;
  return id;
}

export const AddStorePage = () => {
  useDocumentTitle("Add a new store");
  const data = useData();
  const user = useOwner();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<StoreDetailsValues>(emptyStoreDetails);
  const [detailErrors, setDetailErrors] = useState<StoreDetailsErrors>({});
  const [evidence, setEvidence] = useState<OwnershipEvidence>(emptyEvidence);
  const [evidenceErrors, setEvidenceErrors] = useState<EvidenceErrors>({});
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const host = hostname(details.websiteUrl);
  const duplicate = findDuplicate(data, details).byHost;
  const claimable = duplicate && duplicate.ownerId === null && isPublicStore(duplicate) ? duplicate : undefined;

  const goTo = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextFromDetails = () => {
    const errs = validateStoreDetails(data, details);
    setDetailErrors(errs);
    if (Object.keys(errs).length === 0) goTo(1);
  };

  const nextFromEvidence = () => {
    const errs = validateEvidence(evidence);
    setEvidenceErrors(errs);
    if (Object.keys(errs).length === 0) goTo(2);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmed) return setConfirmError("Please confirm that you own or are authorised to manage this store.");
    // Re-check in case another listing was added while the form was open.
    const errs = validateStoreDetails(getData(), details);
    if (Object.keys(errs).length) {
      setDetailErrors(errs);
      goTo(0);
      return;
    }
    setSubmitting(true);
    await fakeRequest(900);
    const num = nextNumber();
    const now = Date.now();
    const storeId = storeSlug(getData(), details.name);
    const appId = `a-${num}`;
    update((d) => {
      const store: Store = {
        id: storeId,
        name: details.name.trim(),
        description: details.description.trim(),
        categoryId: details.categoryId,
        priceLevel: details.priceLevel,
        websiteUrl: details.websiteUrl.trim(),
        keywords: parseKeywords(details.keywords),
        ownerId: user.id,
        hue: Math.floor(Math.random() * 360),
        approval: "pending",
        listing: "active",
        verified: false,
        disabled: false,
        baseRating: 0,
        baseCount: 0,
        createdAt: now,
        addedBy: "owner",
        brokenReports: 0,
        contactEmail: details.contactEmail.trim() || undefined,
      };
      d.stores.push(store);
      d.applications.push({
        id: appId,
        ref: `APP-${num}`,
        type: "new",
        storeId,
        ownerId: user.id,
        status: "pending",
        evidence,
        createdAt: now,
        submittedAt: now,
        updatedAt: now,
        feedback: [],
        history: [{ at: now, actor: user.name, text: "Submitted for review" }],
      });
      notifyAdmins(d, "New store submitted", `${store.name} · APP-${num}`, "/admin/queue");
    });
    setSubmitting(false);
    toast({ title: "Store submitted for review", description: `APP-${num} · We usually reply within one working day.` });
    navigate(`/portal/applications/${appId}`);
  };

  const category = getCategory(data, details.categoryId);

  return (
    <PortalPage
      title="Add a new store"
      subtitle="Submit your online store. An administrator checks your ownership evidence before it appears to shoppers."
    >
      <Card className="mx-auto max-w-3xl p-6 sm:p-8">
        <Stepper step={step} />
        <h2 className="mt-8 text-xl font-semibold">
          Step {step + 1} of 3: {STEPS[step]}
        </h2>

        {step === 0 && (
          <form
            className="mt-6"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              nextFromDetails();
            }}
          >
            {claimable && (
              <Alert tone="brand" title={`${claimable.name} is already listed and has no owner`} className="mb-6">
                If this is your store, claim the existing listing to keep its reviews and rating.
                <div className="mt-2">
                  <Button size="sm" variant="primary" to={`/portal/claim/${claimable.id}`}>
                    Claim {claimable.name}
                  </Button>
                </div>
              </Alert>
            )}
            <StoreDetailsFields values={details} errors={detailErrors} onChange={(p) => setDetails((v) => ({ ...v, ...p }))} />
            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button to="/portal" variant="ghost">
                Cancel
              </Button>
              <Button type="submit" variant="primary" iconRight={<ArrowRight className="size-4" />}>
                Continue
              </Button>
            </div>
          </form>
        )}

        {step === 1 && (
          <form
            className="mt-6"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              nextFromEvidence();
            }}
          >
            <EvidenceFields value={evidence} onChange={(p) => setEvidence((v) => ({ ...v, ...p }))} errors={evidenceErrors} host={host} />
            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => goTo(0)} icon={<ArrowLeft className="size-4" />}>
                Back
              </Button>
              <Button type="submit" variant="primary" iconRight={<ArrowRight className="size-4" />}>
                Continue
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="mt-6 space-y-6" noValidate onSubmit={submit}>
            <section className="rounded-2xl border border-line p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Store details</h3>
                <Button size="sm" variant="ghost" onClick={() => goTo(0)}>
                  Edit
                </Button>
              </div>
              <div className="mt-4 flex items-start gap-4">
                <StoreLogo store={{ name: details.name, hue: 210 }} />
                <dl className="grid min-w-0 flex-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-subtle">Name</dt>
                    <dd className="mt-0.5 font-medium">{details.name}</dd>
                  </div>
                  <div>
                    <dt className="text-subtle">Website</dt>
                    <dd className="mt-0.5 truncate">{details.websiteUrl}</dd>
                  </div>
                  <div>
                    <dt className="text-subtle">Category</dt>
                    <dd className="mt-0.5">{category?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-subtle">Price level</dt>
                    <dd className="mt-0.5">{"$".repeat(details.priceLevel)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-subtle">Description</dt>
                    <dd className="mt-0.5">{details.description}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-subtle">Keywords</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {parseKeywords(details.keywords).map((k) => (
                        <Badge key={k}>{k}</Badge>
                      ))}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>
            <section className="rounded-2xl border border-line p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Ownership evidence</h3>
                <Button size="sm" variant="ghost" onClick={() => goTo(1)}>
                  Edit
                </Button>
              </div>
              <div className="mt-4">
                <EvidenceSummary ev={evidence} />
              </div>
            </section>
            <div>
              <Checkbox
                checked={confirmed}
                onChange={(v) => {
                  setConfirmed(v);
                  if (v) setConfirmError(null);
                }}
                label="I own this store or I am authorised to manage it"
                description="False information can lead to the listing being removed and the account suspended."
              />
              {confirmError && (
                <p role="alert" className="mt-2 text-sm text-bad">
                  {confirmError}
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => goTo(1)} icon={<ArrowLeft className="size-4" />} disabled={submitting}>
                Back
              </Button>
              <Button type="submit" variant="primary" loading={submitting} icon={<Send className="size-4" />}>
                Submit for review
              </Button>
            </div>
          </form>
        )}
      </Card>
    </PortalPage>
  );
};

/* ==================================================================== */
/* Claim an existing listing (W09-5, W09-6, FR11)                        */
/* ==================================================================== */

const PHONE_RE = /^\+?[\d\s-]{9,16}$/;

export const ClaimStorePage = () => {
  const { storeId } = useParams();
  const data = useData();
  const user = useOwner();
  const toast = useToast();
  const navigate = useNavigate();
  const store = data.stores.find((s) => s.id === storeId);
  useDocumentTitle(store ? `Claim ${store.name}` : "Claim a listing");

  const [phone, setPhone] = useState(user.phone ?? "");
  const [position, setPosition] = useState("");
  const [evidence, setEvidence] = useState<OwnershipEvidence>(() => ({ ...emptyEvidence(), method: "email" }));
  const [errors, setErrors] = useState<EvidenceErrors & { phone?: string; position?: string; confirm?: string }>({});
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!store || store.approval !== "approved" || store.disabled) {
    return (
      <Container className="py-16">
        <EmptyState icon={<XCircle />} title="This listing cannot be claimed" action={<Button to="/explore" variant="primary">Find another store</Button>}>
          The store does not exist or is not public. You can add it as a new store instead.
        </EmptyState>
      </Container>
    );
  }

  const myClaims = data.applications.filter((a) => a.type === "claim" && a.storeId === store.id && a.ownerId === user.id);
  const pendingClaim = myClaims.find((a) => a.status === "pending" || a.status === "needs_changes");

  let blocked: ReactNode = null;
  if (store.ownerId === user.id) {
    blocked = (
      <EmptyState icon={<BadgeCheck />} title={`You already manage ${store.name}`} action={<Button to={`/portal/stores/${store.id}`} variant="primary">Manage store</Button>} />
    );
  } else if (store.ownerId) {
    blocked = (
      <EmptyState
        icon={<ShieldCheck />}
        title="This listing already has a verified owner"
        action={
          <>
            <Button to={`/portal/support/new?store=${store.id}&topic=Ownership`} variant="primary">
              Contact support
            </Button>
            <Button to={`/stores/${store.id}`}>Back to store</Button>
          </>
        }
      >
        If you believe you are the real owner of {store.name}, our team can review it with you.
      </EmptyState>
    );
  } else if (pendingClaim) {
    blocked = (
      <EmptyState
        icon={<Clock />}
        title={`Your claim ${pendingClaim.ref} is already being reviewed`}
        action={
          <Button to={`/portal/applications/${pendingClaim.id}`} variant="primary">
            View claim status
          </Button>
        }
      >
        You can only send one claim per listing at a time. Sent {timeAgo(pendingClaim.submittedAt)}.
      </EmptyState>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = { ...validateEvidence(evidence) };
    if (!PHONE_RE.test(phone.trim())) errs.phone = "Enter a phone number we can call, e.g. +966 50 123 4567.";
    if (!position) errs.position = "Choose your role at the store.";
    if (!confirmed) errs.confirm = "Please confirm that you are authorised to manage this store.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    await fakeRequest(900);
    const num = nextNumber();
    const now = Date.now();
    const appId = `a-${num}`;
    update((d) => {
      const notes = [`Role: ${position}`, `Phone: ${phone.trim()}`, evidence.notes].filter(Boolean).join("\n");
      d.applications.push({
        id: appId,
        ref: `APP-${num}`,
        type: "claim",
        storeId: store.id,
        ownerId: user.id,
        status: "pending",
        evidence: { ...evidence, notes },
        createdAt: now,
        submittedAt: now,
        updatedAt: now,
        feedback: [],
        history: [{ at: now, actor: user.name, text: "Claim submitted" }],
      });
      const u = d.users.find((x) => x.id === user.id);
      if (u && !u.phone) u.phone = phone.trim();
      notifyAdmins(d, "New listing claim", `${store.name} · APP-${num}`, "/admin/queue");
    });
    setSubmitting(false);
    toast({ title: "Claim sent", description: `APP-${num} · We will tell you when it is reviewed.` });
    navigate(`/portal/applications/${appId}`);
  };

  return (
    <PortalPage title={`Claim ${store.name}`} subtitle="Prove that you run this store to manage its profile, coupons and replies. Reviews and rating are kept.">
      {blocked ?? (
        <form onSubmit={submit} noValidate className="mx-auto max-w-3xl space-y-6">
          <Card className="flex items-center gap-4 p-5">
            <StoreLogo store={store} />
            <div className="min-w-0">
              <p className="font-semibold">{store.name}</p>
              <p className="truncate text-sm text-muted">{hostname(store.websiteUrl)}</p>
            </div>
            <Link to={`/stores/${store.id}`} className="ml-auto text-sm font-semibold text-brand-text hover:underline">
              View listing
            </Link>
          </Card>
          <Card className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold">Your contact details</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Phone number" htmlFor="claim-phone" required error={errors.phone}>
                <Input id="claim-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} invalid={!!errors.phone} autoComplete="tel" />
              </Field>
              <Field label="Your role" htmlFor="claim-role" required error={errors.position}>
                <Select id="claim-role" value={position} onChange={(e) => setPosition(e.target.value)} invalid={!!errors.position}>
                  <option value="">Choose your role</option>
                  <option>Owner</option>
                  <option>Manager or employee</option>
                  <option>Authorised agency</option>
                </Select>
              </Field>
            </div>
            <h2 className="mt-8 text-lg font-semibold">Ownership evidence</h2>
            <div className="mt-5">
              <EvidenceFields value={evidence} onChange={(p) => setEvidence((v) => ({ ...v, ...p }))} errors={errors} host={hostname(store.websiteUrl)} />
            </div>
            <div className="mt-6">
              <Checkbox checked={confirmed} onChange={setConfirmed} label={`I am authorised to manage ${store.name}`} />
              {errors.confirm && (
                <p role="alert" className="mt-2 text-sm text-bad">
                  {errors.confirm}
                </p>
              )}
            </div>
            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button to={`/stores/${store.id}`} variant="ghost">
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting} icon={<Send className="size-4" />}>
                Send claim
              </Button>
            </div>
          </Card>
        </form>
      )}
    </PortalPage>
  );
};

/* ==================================================================== */
/* My applications (W10, FR13)                                           */
/* ==================================================================== */

type AppFilter = "all" | "open" | "needs_changes" | "approved" | "closed";

const FILTERS: Array<{ value: AppFilter; label: string; match: (a: Application) => boolean }> = [
  { value: "all", label: "All", match: () => true },
  { value: "open", label: "In review", match: (a) => a.status === "pending" },
  { value: "needs_changes", label: "Needs changes", match: (a) => a.status === "needs_changes" },
  { value: "approved", label: "Approved", match: (a) => a.status === "approved" },
  { value: "closed", label: "Rejected / withdrawn", match: (a) => a.status === "rejected" || a.status === "withdrawn" },
];

const storeNameOf = (data: AppData, a: Application) => data.stores.find((s) => s.id === a.storeId)?.name ?? "Withdrawn store";

export const ApplicationsPage = () => {
  useDocumentTitle("My applications");
  const data = useData();
  const user = useOwner();
  const [params, setParams] = useSearchParams();
  const filter = (FILTERS.find((f) => f.value === params.get("status"))?.value ?? "all") as AppFilter;
  const apps = ownerApplications(data, user.id);
  const shown = apps.filter(FILTERS.find((f) => f.value === filter)!.match);

  return (
    <PortalPage
      title="My applications"
      subtitle="Follow your store submissions and listing claims, and fix anything an administrator asks for."
      actions={
        <Button to="/portal/stores/new" variant="primary">
          Add a store
        </Button>
      }
    >
      {apps.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="No applications yet" action={<Button to="/portal/stores/new" variant="primary">Add a store</Button>}>
          When you add a store or claim a listing, you can follow its review here.
        </EmptyState>
      ) : (
        <>
          <div role="group" aria-label="Filter applications" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const count = apps.filter(f.match).length;
              const active = f.value === filter;
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setParams(f.value === "all" ? {} : { status: f.value }, { replace: true })}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                    active ? "border-brand bg-brand text-white" : "border-line bg-surface-2 text-muted hover:text-fg",
                  )}
                >
                  {f.label}
                  <span className={cn("text-xs", active ? "text-white/80" : "text-subtle")}>{count}</span>
                </button>
              );
            })}
          </div>
          {shown.length === 0 ? (
            <EmptyState className="mt-6" icon={<ClipboardList />} title="No applications with this status" action={<Button onClick={() => setParams({})}>Show all</Button>} />
          ) : (
            <ul className="mt-6 grid gap-3 lg:grid-cols-2">
              {shown.map((a) => {
                const store = data.stores.find((s) => s.id === a.storeId);
                const open = a.feedback.filter((f) => !f.done).length;
                return (
                  <li key={a.id}>
                    <Link to={`/portal/applications/${a.id}`} className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2">
                      <div className="flex items-start gap-3">
                        {store ? <StoreLogo store={store} size="sm" /> : <span className="size-9 rounded-lg bg-surface-3" aria-hidden />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{storeNameOf(data, a)}</p>
                          <p className="text-xs text-subtle">
                            {a.ref} · {a.type === "claim" ? "Listing claim" : "New store"} · sent {formatDate(a.submittedAt)}
                          </p>
                        </div>
                        <ApprovalBadge status={a.status} />
                      </div>
                      <p className="mt-3 text-sm text-muted">
                        {a.status === "pending" && "Waiting for an administrator. Usually within one working day."}
                        {a.status === "needs_changes" && `${plural(open, "change")} requested. Fix and resubmit.`}
                        {a.status === "approved" && (a.type === "claim" ? "You now manage this listing." : "Your store is live on DealFinder.")}
                        {a.status === "rejected" && (a.rejectionReason ?? "The application was not approved.")}
                        {a.status === "withdrawn" && "You withdrew this application."}
                      </p>
                      <p className="mt-auto pt-3 text-xs text-subtle">Last update {timeAgo(a.updatedAt)}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </PortalPage>
  );
};

/* ==================================================================== */
/* Application detail: follow-up, resubmission, withdrawal               */
/* ==================================================================== */

function StatusTimeline({ app }: { app: Application }) {
  const decided = app.status === "approved" || app.status === "rejected" || app.status === "withdrawn";
  const steps = [
    { label: "Submitted", sub: formatDate(app.submittedAt), state: "done" as const },
    {
      label: app.status === "needs_changes" ? "Changes requested" : "In review",
      sub: app.status === "needs_changes" ? "Waiting for you" : decided ? "Done" : "Usually 1 working day",
      state: decided ? ("done" as const) : app.status === "needs_changes" ? ("warn" as const) : ("current" as const),
    },
    {
      label: app.status === "approved" ? "Approved" : app.status === "rejected" ? "Rejected" : app.status === "withdrawn" ? "Withdrawn" : "Decision",
      sub: app.decidedAt && decided ? formatDate(app.decidedAt) : "",
      state: app.status === "approved" ? ("done" as const) : app.status === "rejected" ? ("bad" as const) : decided ? ("done" as const) : ("todo" as const),
    },
  ];
  return (
    <ol className="grid gap-4 sm:grid-cols-3">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              s.state === "done" && "bg-ok-soft text-ok",
              s.state === "current" && "bg-brand-soft text-brand-text",
              s.state === "warn" && "bg-warn-soft text-warn",
              s.state === "bad" && "bg-bad-soft text-bad",
              s.state === "todo" && "bg-surface-3 text-subtle",
            )}
            aria-hidden
          >
            {s.state === "done" ? <Check className="size-4" /> : s.state === "bad" ? <XCircle className="size-4" /> : s.state === "warn" ? <RotateCcw className="size-4" /> : <Clock className="size-4" />}
          </span>
          <span>
            <span className="block text-sm font-semibold">{s.label}</span>
            {s.sub && <span className="block text-xs text-subtle">{s.sub}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export const ApplicationDetailPage = () => {
  const { appId } = useParams();
  const data = useData();
  const user = useOwner();
  const app = data.applications.find((a) => a.id === appId && a.ownerId === user.id);
  useDocumentTitle(app ? `Application ${app.ref}` : "Application");
  if (!app) return <NotYoursState what="Application" back="/portal/applications" backLabel="Back to my applications" />;
  return <ApplicationDetail key={app.id} app={app} />;
};

function ApplicationDetail({ app }: { app: Application }) {
  const data = useData();
  const user = useOwner();
  const toast = useToast();
  const navigate = useNavigate();
  const store = data.stores.find((s) => s.id === app.storeId);
  const [editing, setEditing] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const isNew = app.type === "new";
  const openFeedback = app.feedback.filter((f) => !f.done).length;
  // A newer application for the same store replaces this one (e.g. after a rejected resubmission).
  const newer = data.applications.find((a) => a.storeId === app.storeId && a.ownerId === app.ownerId && a.id !== app.id && a.submittedAt > app.submittedAt);
  const canResubmit = isNew && !!store && !newer && (app.status === "needs_changes" || app.status === "rejected");

  const toggleFeedback = (id: string) =>
    update((d) => {
      const f = d.applications.find((a) => a.id === app.id)?.feedback.find((x) => x.id === id);
      if (f) f.done = !f.done;
    });

  const withdraw = async () => {
    setWithdrawing(true);
    await fakeRequest(500);
    update((d) => {
      const a = d.applications.find((x) => x.id === app.id);
      if (!a) return;
      a.status = "withdrawn";
      a.updatedAt = Date.now();
      a.decidedAt = Date.now();
      a.history.push({ at: Date.now(), actor: user.name, text: "Withdrawn by the owner" });
      // A new store that was never approved is removed with its application.
      if (a.type === "new") d.stores = d.stores.filter((s) => !(s.id === a.storeId && s.approval !== "approved"));
    });
    setWithdrawing(false);
    setConfirmWithdraw(false);
    toast({ title: `${app.ref} withdrawn` });
  };

  return (
    <PortalPage
      eyebrow={
        <Link to="/portal/applications" className="hover:underline">
          Store Portal / My applications
        </Link>
      }
      title={
        <span className="flex flex-wrap items-center gap-3">
          {store?.name ?? "Withdrawn store"}
          <ApprovalBadge status={app.status} />
        </span>
      }
      subtitle={`${app.ref} · ${isNew ? "New store submission" : "Listing claim"} · sent ${formatDate(app.submittedAt)}`}
      actions={
        app.status === "pending" ? (
          <Button variant="soft-danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmWithdraw(true)}>
            Withdraw
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card className="p-6">
            <StatusTimeline app={app} />
          </Card>

          {app.status === "approved" && (
            <Alert tone="ok" title={isNew ? "Your store is approved and live" : "Your claim was approved"}>
              {store ? `${store.name} now shows the Verified badge. You can manage its profile, coupons and replies.` : ""}
              {store && (
                <div className="mt-2">
                  <Link to={`/portal/stores/${store.id}`} className="font-semibold underline">
                    Manage {store.name}
                  </Link>
                </div>
              )}
            </Alert>
          )}
          {app.status === "rejected" && (
            <Alert tone="bad" title="Reason for rejection">
              {app.rejectionReason ?? "The administrator did not give a reason. Contact support for details."}
            </Alert>
          )}
          {newer && (
            <Alert tone="brand" title="A newer application replaces this one">
              <Link to={`/portal/applications/${newer.id}`} className="font-semibold underline">
                Open {newer.ref}
              </Link>
            </Alert>
          )}

          {app.feedback.length > 0 && (
            <Card as="section" aria-labelledby="fb-title" className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="fb-title" className="text-lg font-semibold">
                  Requested changes
                </h2>
                <span className="text-sm text-muted">
                  {app.feedback.length - openFeedback} of {app.feedback.length} done
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">Tick each item when you have fixed it. You can resubmit once all are done.</p>
              <ul className="mt-4 space-y-3">
                {app.feedback.map((f) => (
                  <li key={f.id} className={cn("rounded-xl border p-4", f.done ? "border-ok/40 bg-ok-soft/50" : "border-line bg-surface-2")}>
                    <Checkbox
                      checked={f.done}
                      onChange={() => app.status === "needs_changes" && toggleFeedback(f.id)}
                      label={<span className={cn(f.done && "text-muted line-through")}>{f.text}</span>}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {canResubmit && store && (
            <Card as="section" aria-labelledby="resubmit-title" className="p-6">
              <h2 id="resubmit-title" className="text-lg font-semibold">
                {app.status === "rejected" ? "Submit again" : "Fix and resubmit"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {app.status === "rejected"
                  ? "Update the details or choose another way to prove ownership. A new application will be created."
                  : "Update the details below. The same application goes back to the review queue."}
              </p>
              {editing ? (
                <ResubmitForm app={app} store={store} onDone={(id) => (id === app.id ? setEditing(false) : navigate(`/portal/applications/${id}`))} onCancel={() => setEditing(false)} />
              ) : (
                <Button
                  className="mt-4"
                  variant="primary"
                  icon={<RotateCcw className="size-4" />}
                  onClick={() => setEditing(true)}
                >
                  {app.status === "rejected" ? "Start resubmission" : "Edit and resubmit"}
                </Button>
              )}
            </Card>
          )}
          {app.type === "claim" && (app.status === "rejected" || app.status === "withdrawn") && store && !store.ownerId && (
            <Button to={`/portal/claim/${store.id}`} variant="primary" icon={<RotateCcw className="size-4" />}>
              Send a new claim
            </Button>
          )}

          <Card as="section" aria-labelledby="ev-title" className="p-6">
            <h2 id="ev-title" className="text-lg font-semibold">
              Ownership evidence
            </h2>
            <div className="mt-4">
              <EvidenceSummary ev={app.evidence} />
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          {store && (
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <StoreLogo store={store} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{store.name}</p>
                  <p className="truncate text-xs text-muted">{hostname(store.websiteUrl)}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">{getCategory(data, store.categoryId)?.name}</p>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="font-semibold">History</h2>
            <ol className="mt-4 space-y-4 border-l border-line pl-4">
              {[...app.history].reverse().map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-brand-text" aria-hidden />
                  <p className="text-sm font-medium">{h.text}</p>
                  <p className="text-xs text-subtle">
                    {h.actor} · {timeAgo(h.at)}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="p-5 text-sm text-muted">
            Questions about this application?{" "}
            <Link to={`/portal/support/new?store=${app.storeId}&topic=Verification&ref=${app.ref}`} className="font-semibold text-brand-text hover:underline">
              Ask support
            </Link>
          </Card>
        </aside>
      </div>

      <Modal
        open={confirmWithdraw}
        onClose={() => !withdrawing && setConfirmWithdraw(false)}
        icon={<Trash2 />}
        title={`Withdraw ${app.ref}?`}
        description={
          isNew
            ? "The administrator will stop reviewing it and the unpublished store is removed. You can submit it again later."
            : "The administrator will stop reviewing your claim. You can send a new claim later."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmWithdraw(false)} disabled={withdrawing}>
              Keep it
            </Button>
            <Button variant="danger" onClick={withdraw} loading={withdrawing} data-autofocus>
              Withdraw application
            </Button>
          </>
        }
      />
    </PortalPage>
  );
}

/** Edit the store details and evidence, then send the application back to the queue. */
function ResubmitForm({ app, store, onDone, onCancel }: { app: Application; store: Store; onDone: (appId: string) => void; onCancel: () => void }) {
  const data = useData();
  const user = useOwner();
  const toast = useToast();
  const [details, setDetails] = useState<StoreDetailsValues>(() => storeToValues(store));
  const [detailErrors, setDetailErrors] = useState<StoreDetailsErrors>({});
  const [evidence, setEvidence] = useState<OwnershipEvidence>(() => ({ ...app.evidence }));
  const [evidenceErrors, setEvidenceErrors] = useState<EvidenceErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const openFeedback = app.feedback.filter((f) => !f.done).length;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const dErr = validateStoreDetails(data, details, store.id);
    const eErr = validateEvidence(evidence);
    setDetailErrors(dErr);
    setEvidenceErrors(eErr);
    if (Object.keys(dErr).length || Object.keys(eErr).length) {
      toast({ tone: "bad", title: "Please fix the highlighted fields" });
      return;
    }
    if (app.status === "needs_changes" && openFeedback) {
      toast({ tone: "bad", title: `Tick the ${plural(openFeedback, "requested change")} first` });
      return;
    }
    setSubmitting(true);
    await fakeRequest(800);
    const now = Date.now();
    let targetId = app.id;
    let ref = app.ref;
    if (app.status === "rejected") {
      const num = nextNumber();
      targetId = `a-${num}`;
      ref = `APP-${num}`;
    }
    update((d) => {
      const s = d.stores.find((x) => x.id === store.id);
      if (s) {
        s.name = details.name.trim();
        s.websiteUrl = details.websiteUrl.trim();
        s.description = details.description.trim();
        s.categoryId = details.categoryId;
        s.priceLevel = details.priceLevel;
        s.keywords = parseKeywords(details.keywords);
        s.contactEmail = details.contactEmail.trim() || undefined;
        s.approval = "pending";
      }
      if (app.status === "rejected") {
        d.applications.push({
          id: targetId,
          ref,
          type: "new",
          storeId: store.id,
          ownerId: user.id,
          status: "pending",
          evidence,
          createdAt: now,
          submittedAt: now,
          updatedAt: now,
          feedback: [],
          history: [{ at: now, actor: user.name, text: `Resubmitted after ${app.ref} was rejected` }],
        });
      } else {
        const a = d.applications.find((x) => x.id === app.id);
        if (a) {
          a.status = "pending";
          a.evidence = evidence;
          a.submittedAt = now;
          a.updatedAt = now;
          a.history.push({ at: now, actor: user.name, text: `Resubmitted with ${plural(a.feedback.length, "change")}` });
        }
      }
      notifyAdmins(d, "Application resubmitted", `${details.name.trim()} · ${ref}`, "/admin/queue");
    });
    setSubmitting(false);
    toast({ title: `${ref} sent back for review` });
    onDone(targetId);
  };

  return (
    <form onSubmit={submit} noValidate className="mt-6 space-y-8">
      <div>
        <h3 className="mb-4 font-semibold">Store details</h3>
        <StoreDetailsFields idPrefix="resubmit" values={details} errors={detailErrors} onChange={(p) => setDetails((v) => ({ ...v, ...p }))} />
      </div>
      <div>
        <h3 className="mb-4 font-semibold">Ownership evidence</h3>
        <EvidenceFields value={evidence} onChange={(p) => setEvidence((v) => ({ ...v, ...p }))} errors={evidenceErrors} host={hostname(details.websiteUrl)} />
      </div>
      {app.status === "needs_changes" && openFeedback > 0 && (
        <Alert tone="warn">Tick the {plural(openFeedback, "requested change")} above before resubmitting.</Alert>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={submitting} icon={<CircleCheck className="size-4" />}>
          Resubmit for review
        </Button>
      </div>
    </form>
  );
}
