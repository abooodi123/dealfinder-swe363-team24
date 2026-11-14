/**
 * Fictional demo data for the prototype (same stores, people and story as the
 * Milestone 2 storyboards and the Milestone 3 wireframes).
 *
 * `createSeed(now)` builds a fresh database; "Reset demo data" in Prototype tools calls it again.
 * Dates are relative to `now`, so the demo always looks current.
 */
import type {
  AppData,
  Application,
  Category,
  ClickTable,
  Coupon,
  FeaturedSlot,
  Notification,
  OwnershipEvidence,
  Review,
  Store,
  SupportTicket,
  User,
} from "./types";
import { toISODate } from "./format";

/** Bump this when the data shape changes so old localStorage copies are replaced. */
export const DATA_VERSION = 1;

/** Demo accounts (also listed in README.md and Prototype tools). */
export const DEMO_ACCOUNTS = {
  shopper: { email: "noura@example.com", password: "Shopper#2026", label: "Shopper", name: "Noura Al-Dosari" },
  owner: { email: "faisal@example.com", password: "Owner#2026", label: "Store owner", name: "Faisal Al-Mutairi" },
  admin: { email: "admin@dealfinder.app", password: "Admin#2026", label: "Administrator", name: "Mahdi Al-Hashem" },
} as const;

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Deterministic hash so generated numbers are the same on every reset. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Small seeded random generator (mulberry32). */
function seededRandom(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const emptyEvidence = (): OwnershipEvidence => ({
  method: "registration",
  regNumber: "",
  fileName: "",
  fileSize: 0,
  dnsVerified: false,
  emailVerified: "",
  notes: "",
});

export function createSeed(now: number = Date.now()): AppData {
  /** Timestamp `days` (and `hours`) ago. */
  const ago = (days: number, hours = 0) => now - days * DAY - hours * HOUR;
  /** YYYY-MM-DD `days` from today (negative = past). */
  const day = (days: number) => toISODate(now + days * DAY);

  const users: User[] = [
    { id: "u-noura", name: "Noura Al-Dosari", email: "noura@example.com", password: "Shopper#2026", role: "shopper", activated: true, suspended: false, createdAt: ago(120), favorites: ["velvet-vine", "pureglow"] },
    { id: "u-faisal", name: "Faisal Al-Mutairi", email: "faisal@example.com", password: "Owner#2026", role: "owner", activated: true, suspended: false, createdAt: ago(90), favorites: [], phone: "+966 50 123 4567", businessName: "Urban Nest Trading" },
    { id: "u-mahdi", name: "Mahdi Al-Hashem", email: "admin@dealfinder.app", password: "Admin#2026", role: "admin", activated: true, suspended: false, createdAt: ago(200), favorites: [] },
    { id: "u-sara", name: "Sara Al-Qahtani", email: "sara@dealfinder.app", password: "Admin#2026", role: "admin", activated: true, suspended: false, createdAt: ago(180), favorites: [] },
    { id: "u-layla", name: "Layla Hassan", email: "layla@example.com", password: "Owner#2026", role: "owner", activated: true, suspended: false, createdAt: ago(100), favorites: [], phone: "+966 55 987 6543", businessName: "Velvet & Vine Co." },
    { id: "u-omar", name: "Omar Khalid", email: "omar@example.com", password: "Owner#2026", role: "owner", activated: true, suspended: false, createdAt: ago(110), favorites: [], phone: "+966 54 111 2222", businessName: "Khalid Digital" },
    { id: "u-pending", name: "Huda Nasser", email: "pending@example.com", password: "Shopper#2026", role: "shopper", activated: false, suspended: false, createdAt: ago(1), favorites: [] },
    { id: "u-blocked", name: "Tariq Blocked", email: "blocked@example.com", password: "Shopper#2026", role: "shopper", activated: true, suspended: true, createdAt: ago(60), favorites: [] },
  ];

  const categories: Category[] = [
    { id: "electronics", name: "Electronics", icon: "Cpu", hidden: false },
    { id: "fashion", name: "Fashion & Apparel", icon: "Shirt", hidden: false },
    { id: "home", name: "Home & Garden", icon: "House", hidden: false },
    { id: "beauty", name: "Beauty & Health", icon: "Sparkles", hidden: false },
    { id: "sports", name: "Sports & Outdoors", icon: "Trophy", hidden: false },
    { id: "digital", name: "Digital Goods", icon: "Gamepad2", hidden: false },
  ];

  let hue = 0;
  const store = (
    id: string,
    name: string,
    categoryId: string,
    priceLevel: Store["priceLevel"],
    host: string,
    baseRating: number,
    baseCount: number,
    description: string,
    keywords: string[],
    ownerId: string | null,
    extra: Partial<Store> = {},
  ): Store => ({
    id,
    name,
    description,
    categoryId,
    priceLevel,
    websiteUrl: `https://${host}`,
    keywords,
    ownerId,
    hue: (hue += 47) % 360,
    approval: "approved",
    listing: "active",
    verified: true,
    disabled: false,
    baseRating,
    baseCount,
    createdAt: ago(60 + (hash(id) % 200)),
    addedBy: ownerId ? "owner" : "admin",
    brokenReports: 0,
    ...extra,
  });

  const stores: Store[] = [
    store("cloudnexus", "CloudNexus Hosting", "electronics", 2, "cloudnexus.example", 4.8, 1240, "Enterprise-grade cloud hosting with 99.99% uptime and 24/7 dedicated support for scaling businesses.", ["hosting", "servers", "cloud", "vps"], "u-omar"),
    store("bluesky", "BlueSky Domains", "electronics", 1, "bluesky-domains.example", 4.5, 856, "Affordable domain registration and simple shared hosting packages perfect for small blogs and portfolios.", ["domains", "hosting", "website"], "u-omar"),
    store("velvet-vine", "Velvet & Vine", "fashion", 2, "velvetandvine.example", 4.9, 2100, "Sustainable fashion label focusing on organic materials and ethical manufacturing for the modern wardrobe.", ["clothing", "dresses", "organic", "sustainable"], "u-layla"),
    store("urban-nest", "Urban Nest", "home", 2, "urbannest.sa", 4.6, 332, "Curated home decor and modular furniture designed for efficient and aesthetic city living.", ["lamps", "lamp", "home decor", "furniture", "lighting"], "u-faisal"),
    store("pureglow", "PureGlow Botanicals", "beauty", 2, "pureglow.example", 4.7, 520, "Cruelty-free skincare and wellness products derived from rare alpine botanicals and minerals.", ["skincare", "serum", "cruelty free", "gift set"], "u-layla"),
    store("greengrocer", "GreenGrocer Direct", "home", 1, "greengrocer.example", 4.4, 1890, "Farm-to-table grocery delivery service connecting local organic producers with urban families.", ["grocery", "organic", "delivery", "food"], "u-omar"),
    store("techhaven", "TechHaven Gadgets", "electronics", 2, "techhaven.example", 4.3, 410, "Phones, chargers and smart-home gadgets from trusted brands, with 2-year warranty on every order.", ["phones", "chargers", "smart home", "gadgets"], "u-omar"),
    store("oasis", "Oasis Outdoors", "sports", 2, "oasis-outdoors.example", 4.6, 298, "Camping, hiking and desert-trip equipment tested in real conditions by our own guides.", ["camping", "tents", "hiking", "outdoor"], "u-omar"),
    store("stridelab", "StrideLab Running", "sports", 2, "stridelab.example", 4.5, 187, "Running shoes fitted by gait analysis, plus apparel and recovery gear for every distance.", ["running", "shoes", "fitness"], null, { verified: false }),
    store("bytecraft", "ByteCraft Games", "digital", 1, "bytecraft.example", 4.2, 640, "Game keys, gift cards and in-game currency delivered instantly by email.", ["games", "gift cards", "keys"], "u-omar"),
    store("pixelvault", "PixelVault Software", "digital", 2, "pixelvault.example", 4.4, 233, "Creative software licences and asset packs for designers, editors and indie developers.", ["software", "licenses", "design"], null, { listing: "closed" }),
    store("saffron", "Saffron & Sage", "beauty", 3, "saffronandsage.example", 4.8, 96, "Small-batch perfumes and oud blends made in Al-Ahsa. Gift wrapping and engraving available.", ["perfume", "oud", "fragrance", "gift"], "u-layla"),
    store("desert-rose", "Desert Rose Boutique", "fashion", 3, "desertrose.example", 4.7, 151, "Modern abayas and occasion wear, tailored to order with delivery across the Kingdom.", ["abaya", "occasion wear", "tailoring"], null),
    store("loom-linen", "Loom & Linen", "home", 2, "loomlinen.sa", 4.5, 212, "Handwoven rugs, linen bedding and table textiles from regional artisans.", ["rugs", "bedding", "textiles", "linen"], null),
    store("voltix", "Voltix Audio", "electronics", 3, "voltix-audio.example", 4.6, 330, "Headphones, speakers and studio monitors with free 30-day returns.", ["headphones", "speakers", "audio"], null),
    store("palm-pine", "Palm & Pine Decor", "home", 1, "palmandpine.sa", 4.1, 74, "Affordable planters, frames and small furniture for first apartments.", ["planters", "frames", "decor"], null, { verified: false, websiteDown: true }),
    store("urban-nest-kids", "Urban Nest Kids", "home", 2, "urbannestkids.com", 4.3, 58, "Playful furniture and storage for children’s rooms.", ["kids", "furniture", "storage"], "u-omar"),
    store("fresh-pantry", "Fresh Pantry", "home", 1, "freshpantry.sa", 0, 0, "Pantry staples, spices and dates delivered across the Eastern Province within 48 hours.", ["dates", "spices", "pantry"], null, { createdAt: ago(4) }),
    // Not public: still in the application process (used by the owner portal and admin queue).
    store("nest-kids", "Nest Kids", "home", 2, "nestkids.sa", 0, 0, "Soft toys, bedding and nursery decor for newborns and toddlers in the Eastern Province.", ["nursery", "toys", "baby"], "u-faisal", { approval: "pending", verified: false, createdAt: ago(2) }),
    store("aroma-lane", "Aroma Lane", "beauty", 1, "aromalane.sa", 0, 0, "Scented candles and diffusers made with natural wax.", ["candles", "diffusers"], "u-faisal", { approval: "needs_changes", verified: false, createdAt: ago(6) }),
    store("dune-popup", "Dune Pop-up", "fashion", 2, "duneshop.co", 0, 0, "Seasonal pop-up for streetwear.", ["streetwear"], "u-faisal", { approval: "rejected", verified: false, createdAt: ago(20) }),
    store("henna-house", "Henna House", "beauty", 1, "hennahouse.example", 0, 0, "Natural henna kits, aftercare balms and gift sets shipped across the Kingdom.", ["henna", "gifts"], "u-layla", { approval: "pending", verified: false, createdAt: ago(1) }),
  ];

  const review = (
    storeId: string,
    userName: string,
    rating: number,
    comment: string,
    daysAgo: number,
    extra: Partial<Review> = {},
  ): Review => ({
    id: `r-${storeId}-${userName.replace(/\W/g, "").toLowerCase()}-${daysAgo}`,
    storeId,
    userId: null,
    userName,
    rating,
    comment,
    createdAt: ago(daysAgo, 3),
    status: "visible",
    inBase: true,
    flags: [],
    ...extra,
  });

  const reviews: Review[] = [
    review("cloudnexus", "John D.", 4, "Excellent service and fast shipping. Highly recommend this store for anyone looking for quality hosting.", 2),
    review("cloudnexus", "Alice M.", 4, "Great selection of plans, but the dashboard could be a bit faster. Overall a good experience.", 4),
    review("cloudnexus", "Robert K.", 5, "The support team was very helpful when I had a question about migration. Will definitely stay.", 7),
    review("bluesky", "Khaled A.", 5, "Cheap and reliable. Transfer of my domain took under an hour.", 9),
    review("bluesky", "Promo Bot", 5, "BEST PRICES!!! visit cheap-deals.biz or call +966 50 000 0000 for 90% OFF", 1, {
      inBase: false,
      flags: [
        { by: "u-omar", byRole: "owner", reason: "Spam or fake", note: "Not a customer, advertising another site.", at: ago(1) },
        { by: "u-noura", byRole: "shopper", reason: "Spam or fake", at: ago(0, 6) },
      ],
    }),
    review("velvet-vine", "Maya S.", 5, "Beautiful materials and accurate sizing. The packaging felt thoughtful too.", 3),
    review("velvet-vine", "Reem F.", 5, "The linen dress is my new favourite. Delivery to Riyadh took three days.", 12),
    review("velvet-vine", "Dana H.", 4, "Lovely quality. Returns were easy but the refund took a week.", 20, {
      reply: { text: "Thank you Dana. We have sped up refunds to 3 working days since your order.", at: ago(19) },
    }),
    review("urban-nest", "Sami T.", 5, "The oak side table arrived perfectly packed. Exactly like the photos.", 5),
    review("urban-nest", "Noor B.", 3, "Shipping took six days. The lamp is lovely but I expected it sooner.", 0, { createdAt: ago(0, 5) }),
    review("urban-nest", "Yousef R.", 5, "Great service when I needed to swap a colour. Replied the same day.", 14, {
      reply: { text: "Happy to help Yousef, enjoy the new colour!", at: ago(13) },
    }),
    review("urban-nest", "Lina K.", 4, "Good value for the quality. Would like more lighting options.", 21),
    review("pureglow", "Sam L.", 4, "Gentle products and quick delivery. I would like to see more travel sizes.", 5),
    review("pureglow", "Hessa M.", 5, "The serum made a visible difference after two weeks.", 11),
    review("greengrocer", "Ahmed Z.", 4, "Fresh produce, delivery window was accurate.", 6),
    review("greengrocer", "Mona Q.", 3, "Good quality but two items were missing from my box.", 16, {
      flags: [{ by: "u-omar", byRole: "owner", reason: "Offensive or abusive", at: ago(15) }],
    }),
    review("techhaven", "Fahad N.", 4, "Original chargers and the warranty card was included.", 8),
    review("oasis", "Bader S.", 5, "The tent survived a windy night in Al-Ula. Excellent.", 10),
    review("bytecraft", "Ali W.", 4, "Key arrived in two minutes.", 4),
    review("bytecraft", "Rakan J.", 2, "Key was already used. Support fixed it but took a day.", 25),
    review("saffron", "Jory A.", 5, "The oud blend smells exactly like my grandmother’s house.", 18),
    review("voltix", "Majed O.", 5, "Studio monitors are fantastic for the price.", 13),
    review("loom-linen", "Nada P.", 5, "The rug is gorgeous and thick.", 30),
    review("desert-rose", "Shahad G.", 5, "The abaya fit perfectly after one adjustment.", 22),
    review("urban-nest", "Ghost Writer", 1, "This is a scam, all of them are idiots.", 2, {
      inBase: false,
      status: "hidden",
      modNote: "Abusive language",
      flags: [{ by: "u-faisal", byRole: "owner", reason: "Offensive or abusive", at: ago(2) }],
    }),
  ];

  const coupon = (
    id: string,
    storeId: string,
    code: string,
    title: string,
    description: string,
    kind: Coupon["kind"],
    value: number,
    expiresAt: string,
    active: boolean,
    copies: number,
  ): Coupon => ({ id, storeId, code, title, description, kind, value, expiresAt, active, copies, createdAt: ago(30) });

  const coupons: Coupon[] = [
    coupon("c1", "cloudnexus", "CLOUD20", "20% off annual hosting", "Save on the first year of any annual cloud hosting plan.", "percent", 20, day(80), true, 214),
    coupon("c2", "velvet-vine", "THREADS15", "New season discount", "Use this code on sustainable apparel orders above 300 SAR.", "percent", 15, day(25), true, 160),
    coupon("c3", "urban-nest", "NEST15", "15% off lighting", "Applies to all lamps and light fixtures.", "percent", 15, day(45), true, 141),
    coupon("c4", "urban-nest", "SPRING50", "50 SAR off your first order", "Spring welcome offer.", "fixed", 50, day(-12), true, 88),
    coupon("c5", "urban-nest", "FREESHIP", "Free shipping over 400 SAR", "Eastern Province deliveries only.", "fixed", 25, day(60), false, 12),
    coupon("c6", "pureglow", "WELCOME10", "10% welcome gift", "For first-time customers.", "percent", 10, day(90), true, 73),
    coupon("c7", "oasis", "DESERT25", "25 SAR off camping kits", "Valid on kits above 500 SAR.", "fixed", 25, day(35), true, 40),
  ];

  const featured: FeaturedSlot[] = [
    { id: "f1", kind: "store", storeId: "velvet-vine", location: "home", start: day(-10), end: day(20), createdAt: ago(12) },
    { id: "f2", kind: "store", storeId: "cloudnexus", location: "home", start: day(-3), end: day(27), createdAt: ago(5) },
    { id: "f3", kind: "store", storeId: "urban-nest", location: "home", start: day(5), end: day(35), createdAt: ago(1) },
    { id: "f4", kind: "coupon", storeId: "velvet-vine", couponId: "c2", location: "home", start: day(-2), end: day(20), createdAt: ago(3) },
    { id: "f5", kind: "coupon", storeId: "cloudnexus", couponId: "c1", location: "home", start: day(-1), end: day(30), createdAt: ago(2) },
    { id: "f6", kind: "store", storeId: "oasis", location: "explore", start: day(-1), end: day(14), createdAt: ago(2) },
  ];

  const evidence = (e: Partial<OwnershipEvidence>): OwnershipEvidence => ({ ...emptyEvidence(), ...e });
  const application = (
    num: number,
    type: Application["type"],
    storeId: string,
    ownerId: string,
    status: Application["status"],
    ev: OwnershipEvidence,
    extra: Partial<Application> = {},
  ): Application => ({
    id: `a-${num}`,
    ref: `APP-${num}`,
    type,
    storeId,
    ownerId,
    status,
    evidence: ev,
    createdAt: ago(3),
    submittedAt: ago(3),
    updatedAt: ago(2),
    feedback: [],
    history: [],
    ...extra,
  });

  const applications: Application[] = [
    application(1001, "new", "urban-nest", "u-faisal", "approved", evidence({ regNumber: "1010123456", fileName: "cr-urban-nest.pdf", fileSize: 1_200_000 }), {
      createdAt: ago(92), submittedAt: ago(90), decidedAt: ago(88), decidedBy: "Mahdi Al-Hashem", updatedAt: ago(88),
      history: [
        { at: ago(90), actor: "Faisal Al-Mutairi", text: "Submitted for review" },
        { at: ago(88), actor: "Mahdi Al-Hashem", text: "Approved. Verified badge granted." },
      ],
    }),
    application(1038, "new", "aroma-lane", "u-faisal", "needs_changes", evidence({ regNumber: "101012345", fileName: "aroma-cr.pdf", fileSize: 900_000 }), {
      createdAt: ago(6), submittedAt: ago(5), updatedAt: ago(1), decidedAt: ago(1), decidedBy: "Sara Al-Qahtani",
      feedback: [
        { id: "f1", text: "The commercial registration number must have 10 digits. We found 9.", done: false },
        { id: "f2", text: "Please describe what you sell in at least 20 characters and add your category keywords.", done: false },
      ],
      history: [
        { at: ago(5), actor: "Faisal Al-Mutairi", text: "Submitted for review" },
        { at: ago(1), actor: "Sara Al-Qahtani", text: "Asked for 2 changes" },
      ],
    }),
    application(1042, "new", "nest-kids", "u-faisal", "pending", evidence({ method: "email", emailVerified: "faisal@nestkids.sa" }), {
      createdAt: ago(3), submittedAt: ago(2), updatedAt: ago(2),
      history: [{ at: ago(2), actor: "Faisal Al-Mutairi", text: "Submitted for review" }],
    }),
    application(1031, "new", "dune-popup", "u-faisal", "rejected", evidence({ method: "dns" }), {
      createdAt: ago(22), submittedAt: ago(21), decidedAt: ago(19), decidedBy: "Mahdi Al-Hashem", updatedAt: ago(19),
      rejectionReason: "We could not confirm that you operate duneshop.co. The DNS record was not found after 24 hours and no other proof was supplied.",
      history: [
        { at: ago(21), actor: "Faisal Al-Mutairi", text: "Submitted for review" },
        { at: ago(19), actor: "Mahdi Al-Hashem", text: "Rejected" },
      ],
    }),
    application(1044, "claim", "loom-linen", "u-layla", "pending", evidence({ method: "email", emailVerified: "layla@loomlinen.sa" }), {
      createdAt: ago(2), submittedAt: ago(2), updatedAt: ago(2),
      history: [{ at: ago(2), actor: "Layla Hassan", text: "Claim submitted" }],
    }),
    application(1045, "claim", "loom-linen", "u-omar", "pending", evidence({ regNumber: "1010987654", fileName: "cr-khalid.pdf", fileSize: 800_000 }), {
      createdAt: ago(1), submittedAt: ago(1), updatedAt: ago(1),
      history: [{ at: ago(1), actor: "Omar Khalid", text: "Claim submitted" }],
    }),
    application(1047, "new", "henna-house", "u-layla", "pending", evidence({ regNumber: "1010556677", fileName: "henna-cr.png", fileSize: 600_000 }), {
      createdAt: ago(1), submittedAt: ago(1), updatedAt: ago(1),
      history: [{ at: ago(1), actor: "Layla Hassan", text: "Submitted for review" }],
    }),
  ];

  const tickets: SupportTicket[] = [
    {
      id: "t-2201", ref: "SUP-2201", ownerId: "u-faisal", storeId: "nest-kids", subject: "How long does verification take?", topic: "Verification", status: "answered",
      messages: [
        { id: "m1", from: "owner", name: "Faisal Al-Mutairi", text: "I submitted Nest Kids two days ago. How long does the review normally take, and can I speed it up?", at: ago(2) },
        { id: "m2", from: "admin", name: "Sara Al-Qahtani", text: "Hi Faisal, reviews usually finish within one working day. Nest Kids is next in the queue and we do not need anything more from you.", at: ago(0, 4) },
      ],
      ownerUnread: true, adminUnread: false, createdAt: ago(2), updatedAt: ago(0, 4),
    },
    {
      id: "t-2202", ref: "SUP-2202", ownerId: "u-layla", storeId: "loom-linen", subject: "Someone else is claiming Loom & Linen", topic: "Ownership", status: "open",
      messages: [
        { id: "m3", from: "owner", name: "Layla Hassan", text: "I own loomlinen.sa and I see another owner has also sent a claim. I can provide the commercial registration if needed.", at: ago(1) },
      ],
      ownerUnread: false, adminUnread: true, createdAt: ago(1), updatedAt: ago(1),
    },
  ];

  const notification = (id: string, userId: string, text: string, sub: string, link: string, days: number, hours: number, read = false): Notification => ({
    id, userId, text, sub, link, at: ago(days, hours), read,
  });

  const notifications: Notification[] = [
    notification("n1", "u-faisal", "Aroma Lane needs changes", "2 items to fix", "/portal/applications/a-1038", 1, 0),
    notification("n2", "u-faisal", "New 3-star review on Urban Nest", "“Shipping took six days.”", "/portal/reviews", 0, 5),
    notification("n3", "u-faisal", "Support replied to your question", "SUP-2201 · How long does verification take?", "/portal/support/t-2201", 0, 4),
    notification("n4", "u-faisal", "Broken link reported", "A shopper could not open Urban Nest’s website", "/portal/stores/urban-nest", 2, 0, true),
    notification("n5", "u-mahdi", "3 submissions are waiting", "Oldest has waited 2 days", "/admin/queue", 0, 2),
    notification("n6", "u-mahdi", "2 reviews were flagged", "Open the moderation queue", "/admin/moderation", 0, 6),
  ];

  // 120 days of referral clicks per approved store, shaped by weekday and a slow upward trend.
  const clicks: ClickTable = {};
  for (const s of stores.filter((x) => x.approval === "approved")) {
    const rand = seededRandom(hash(s.id));
    const base = 5 + (hash(s.id) % 28) + Math.round(s.baseCount / 160);
    const table: Record<string, number> = {};
    for (let d = 119; d >= 0; d--) {
      const date = new Date(now - d * DAY);
      const weekday = [0.8, 1, 1.05, 1.1, 1, 0.7, 0.65][date.getDay()];
      const trend = 0.75 + ((120 - d) / 120) * 0.5;
      table[toISODate(date)] = Math.max(0, Math.round(base * weekday * trend * (0.7 + rand() * 0.6)));
    }
    clicks[s.id] = table;
  }

  return {
    version: DATA_VERSION,
    session: null,
    users,
    categories,
    stores,
    reviews,
    coupons,
    featured,
    applications,
    tickets,
    notifications,
    clicks,
    log: [
      { at: ago(1), actor: "Sara Al-Qahtani", text: "Asked Faisal for 2 changes on Aroma Lane (APP-1038)" },
      { at: ago(3), actor: "Mahdi Al-Hashem", text: "Hid a review on Urban Nest (abusive language)" },
      { at: ago(19), actor: "Mahdi Al-Hashem", text: "Rejected Dune Pop-up (APP-1031)" },
      { at: ago(88), actor: "Mahdi Al-Hashem", text: "Approved Urban Nest (APP-1001)" },
    ],
    seq: 1050,
  };
}
