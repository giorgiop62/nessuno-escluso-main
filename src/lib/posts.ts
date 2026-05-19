import {
  categoryMeta,
  visibleEventStatuses,
  type Category,
  type EventStatus,
  type LocalEvent,
} from "@/lib/events-data";
import { firebaseAuth, firestore } from "@/integrations/firebase/client";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

export type PostRow = {
  id: string;
  title: string;
  description: string;
  category: Category;
  latitude: number;
  longitude: number;
  location_name: string | null;
  image_url: string | null;
  image_path: string | null;
  author_id: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  status: EventStatus;
  verification_score: number;
  verification_evidence: VerificationEvidence;
  report_count: number;
  updated_at: string;
  creator_id: string;
  creator_name: string;
  creator_trust_score: number;
  creator_is_verified_organizer: boolean;
  created_at: string;
  expires_at: string | null;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type VerificationEvidence = {
  officialUrl?: string | null;
  instagramUrl?: string | null;
  flyerImageUrl?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  contactPhone?: string | null;
  organizerName?: string | null;
};

export type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  trust_score: number;
  is_verified_organizer: boolean;
  events_created_count: number;
  reports_received_count: number;
  successful_events_count: number;
  account_created_at: string;
  business_name: string | null;
  business_address: string | null;
  business_vat_or_id: string | null;
  business_website: string | null;
  business_instagram: string | null;
  verification_status: "pending" | "verified" | "rejected";
};

export type EventReportReason =
  | "fake_event"
  | "wrong_location"
  | "spam"
  | "offensive_content"
  | "scam"
  | "duplicate"
  | "other";

export type EventReport = {
  report_id: string;
  event_id: string;
  reporter_id: string;
  reason: EventReportReason;
  description: string | null;
  created_at: string;
};

export type CreatePostInput = {
  title: string;
  description: string;
  category: Category;
  latitude: number;
  longitude: number;
  locationName?: string | null;
  expiresAt: string;
  isSpontaneous?: boolean;
  verificationEvidence?: VerificationEvidence;
};

export type UpdatePostInput = {
  id: string;
  title: string;
  description: string;
  category: Category;
  locationName?: string | null;
  expiresAt: string;
};

export function postToEvent(post: PostRow): LocalEvent {
  const created = new Date(post.created_at);
  const eventDate = post.expires_at ? new Date(post.expires_at) : created;

  return {
    id: post.id,
    title: post.title,
    description: post.description,
    category: post.category as Category,
    time: eventDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    date: eventDate.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
    distance: "qui",
    location: post.location_name ?? "Posizione salvata",
    participants: 0,
    host: post.profiles?.display_name ?? "Anonimo",
    latitude: post.latitude,
    longitude: post.longitude,
    imageUrl: post.image_url,
    createdAt: post.created_at,
    authorId: post.author_id,
    status: post.status,
    verificationScore: post.verification_score,
    reportCount: post.report_count,
    isVerifiedOrganizer: post.creator_is_verified_organizer,
    evidence: post.verification_evidence,
  };
}

export async function fetchPosts() {
  const snapshot = await getDocs(
    query(collection(firestore, "posts"), where("status", "in", visibleEventStatuses)),
  );
  const posts = snapshot.docs.map((post) => fromFirestorePost(post.id, post.data()));
  const now = Date.now();
  const expired = posts.filter(
    (post) => post.expires_at && new Date(post.expires_at).getTime() <= now,
  );

  void Promise.allSettled(expired.map((post) => deletePostIfAllowed(post)));

  return posts
    .filter(
      (post) =>
        visibleEventStatuses.includes(post.status) &&
        (!post.expires_at || new Date(post.expires_at).getTime() > now),
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function fetchMyPosts() {
  const user = firebaseAuth.currentUser;
  if (!user) return [];

  const snapshot = await getDocs(
    query(collection(firestore, "posts"), where("author_id", "==", user.uid)),
  );
  const now = Date.now();
  return snapshot.docs
    .map((post) => fromFirestorePost(post.id, post.data()))
    .filter((post) => !post.expires_at || new Date(post.expires_at).getTime() > now)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function fetchPost(id: string) {
  const snapshot = await getDoc(doc(firestore, "posts", id));
  if (!snapshot.exists()) return null;
  const post = fromFirestorePost(snapshot.id, snapshot.data());
  if (post.expires_at && new Date(post.expires_at).getTime() <= Date.now()) {
    void deletePostIfAllowed(post);
    return null;
  }
  if (!visibleEventStatuses.includes(post.status) && !isCurrentUserAllowedToSee(post)) return null;
  return post;
}

export async function createPost(input: CreatePostInput) {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Devi accedere per creare un post-it.");
  await ensureUserProfile();

  const profile = await fetchUserProfile(user.uid);
  const postsToday = await countPostsCreatedToday(user.uid);
  const limit = dailyEventLimit(profile);
  if (postsToday >= limit) {
    throw new Error(`Limite anti-spam raggiunto: puoi creare ${limit} evento/i al giorno.`);
  }

  const moderation = await moderatePostInput(input);
  if (moderation.blocked) throw new Error(moderation.reason);

  const verificationEvidence = normalizeEvidence(input.verificationEvidence);
  const verificationScore = calculateVerificationScore(verificationEvidence);
  const status = resolveInitialStatus({
    isSpontaneous: Boolean(input.isSpontaneous),
    verificationScore,
    forceReview:
      moderation.review || profile.reports_received_count >= 5 || profile.trust_score < 0,
  });

  const docRef = await addDoc(collection(firestore, "posts"), {
    title: input.title,
    description: input.description,
    category: categoryMeta[input.category] ? input.category : "social",
    latitude: input.latitude,
    longitude: input.longitude,
    location_name: input.locationName ?? null,
    image_url: null,
    image_path: null,
    author_id: user.uid,
    creator_id: user.uid,
    author_display_name: user.displayName ?? user.email?.split("@")[0] ?? "Anonimo",
    creator_name: user.displayName ?? user.email?.split("@")[0] ?? "Anonimo",
    author_avatar_url: user.photoURL ?? null,
    status,
    verification_score: verificationScore,
    verification_evidence: verificationEvidence,
    report_count: 0,
    creator_trust_score: profile.trust_score,
    creator_is_verified_organizer: profile.is_verified_organizer,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    expires_at: Timestamp.fromDate(new Date(input.expiresAt)),
  });

  await updateDoc(doc(firestore, "profiles", user.uid), {
    events_created_count: increment(1),
    display_name: user.displayName ?? user.email?.split("@")[0] ?? "Anonimo",
    avatar_url: user.photoURL ?? null,
  });

  const snapshot = await getDoc(docRef);
  return fromFirestorePost(snapshot.id, snapshot.data());
}

export async function updatePost(input: UpdatePostInput) {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Devi accedere per modificare un post-it.");

  const postRef = doc(firestore, "posts", input.id);
  const snapshot = await getDoc(postRef);
  if (!snapshot.exists()) throw new Error("Post-it non trovato.");
  const post = fromFirestorePost(snapshot.id, snapshot.data());
  if (post.author_id !== user.uid) throw new Error("Puoi modificare solo i tuoi post-it.");

  await updateDoc(postRef, {
    title: input.title,
    description: input.description,
    category: categoryMeta[input.category] ? input.category : "social",
    location_name: input.locationName ?? post.location_name,
    expires_at: Timestamp.fromDate(new Date(input.expiresAt)),
    updated_at: serverTimestamp(),
  });

  const nextSnapshot = await getDoc(postRef);
  return fromFirestorePost(nextSnapshot.id, nextSnapshot.data());
}

export async function deletePost(id: string) {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Devi accedere per eliminare un post-it.");

  const postRef = doc(firestore, "posts", id);
  const snapshot = await getDoc(postRef);
  if (!snapshot.exists()) return;
  const post = fromFirestorePost(snapshot.id, snapshot.data());
  if (post.author_id !== user.uid) throw new Error("Puoi eliminare solo i tuoi post-it.");

  await deleteDoc(postRef);
}

export async function ensureUserProfile() {
  const user = firebaseAuth.currentUser;
  if (!user) return null;

  const ref = doc(firestore, "profiles", user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return fromFirestoreProfile(user.uid, snapshot.data());

  const profile = {
    display_name: user.displayName ?? user.email?.split("@")[0] ?? "Anonimo",
    avatar_url: user.photoURL ?? null,
    trust_score: 0,
    is_verified_organizer: false,
    events_created_count: 0,
    reports_received_count: 0,
    successful_events_count: 0,
    account_created_at: serverTimestamp(),
    business_name: null,
    business_address: null,
    business_vat_or_id: null,
    business_website: null,
    business_instagram: null,
    verification_status: "pending",
  };

  await setDoc(ref, profile);
  const nextSnapshot = await getDoc(ref);
  return fromFirestoreProfile(user.uid, nextSnapshot.data());
}

export async function fetchUserProfile(userId: string) {
  const snapshot = await getDoc(doc(firestore, "profiles", userId));
  if (!snapshot.exists()) {
    const currentUser = firebaseAuth.currentUser;
    if (currentUser?.uid === userId) {
      const profile = await ensureUserProfile();
      if (profile) return profile;
    }
  }
  return fromFirestoreProfile(userId, snapshot.data());
}

export async function reportPost(input: {
  eventId: string;
  reason: EventReportReason;
  description?: string;
}) {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Accedi per segnalare l'evento.");

  const reportRef = doc(firestore, "reports", `${input.eventId}_${user.uid}`);
  const postRef = doc(firestore, "posts", input.eventId);
  const now = serverTimestamp();

  await runTransaction(firestore, async (transaction) => {
    const existingReport = await transaction.get(reportRef);
    if (existingReport.exists()) throw new Error("Hai già segnalato questo evento.");

    const postSnapshot = await transaction.get(postRef);
    if (!postSnapshot.exists()) throw new Error("Evento non trovato.");
    const post = fromFirestorePost(postSnapshot.id, postSnapshot.data());
    if (post.author_id === user.uid) throw new Error("Non puoi segnalare un tuo evento.");

    const nextReportCount = post.report_count + 1;
    const nextStatus =
      nextReportCount >= 5 ? "hidden" : nextReportCount >= 3 ? "under_review" : post.status;

    transaction.set(reportRef, {
      report_id: reportRef.id,
      event_id: input.eventId,
      reporter_id: user.uid,
      reason: input.reason,
      description: input.description?.trim() || null,
      created_at: now,
    });
    transaction.update(postRef, {
      report_count: nextReportCount,
      status: nextStatus,
      updated_at: now,
    });
    if (post.author_id) {
      transaction.update(doc(firestore, "profiles", post.author_id), {
        reports_received_count: increment(1),
      });
    }
  });
}

export async function fetchModerationPosts() {
  const snapshot = await getDocs(
    query(collection(firestore, "posts"), orderBy("created_at", "desc")),
  );
  return snapshot.docs
    .map((post) => fromFirestorePost(post.id, post.data()))
    .filter((post) => post.status === "under_review" || post.status === "hidden");
}

export async function fetchReports() {
  const snapshot = await getDocs(
    query(collection(firestore, "reports"), orderBy("created_at", "desc")),
  );
  return snapshot.docs.map((report) => fromFirestoreReport(report.id, report.data()));
}

export async function setPostStatus(postId: string, status: EventStatus) {
  await updateDoc(doc(firestore, "posts", postId), {
    status,
    updated_at: serverTimestamp(),
  });
}

export async function updateUserTrustScore(userId: string, trustScore: number) {
  await updateDoc(doc(firestore, "profiles", userId), {
    trust_score: Math.max(-100, Math.min(100, Math.round(trustScore))),
  });
}

export async function verifyOrganizer(userId: string) {
  await updateDoc(doc(firestore, "profiles", userId), {
    is_verified_organizer: true,
    verification_status: "verified",
  });
}

export async function isCurrentUserAdmin() {
  const user = firebaseAuth.currentUser;
  if (!user) return false;
  const token = await user.getIdTokenResult();
  return token.claims.admin === true;
}

function fromFirestorePost(id: string, data: Record<string, unknown> | undefined): PostRow {
  if (!data) throw new Error("Post-it non trovato.");

  const createdAt = data.created_at;
  const expiresAt = data.expires_at;
  const updatedAt = data.updated_at;
  const createdDate =
    createdAt && typeof (createdAt as Timestamp).toDate === "function"
      ? (createdAt as Timestamp).toDate()
      : typeof createdAt === "string"
        ? new Date(createdAt)
        : new Date();
  const expiresDate =
    expiresAt && typeof (expiresAt as Timestamp).toDate === "function"
      ? (expiresAt as Timestamp).toDate()
      : typeof expiresAt === "string"
        ? new Date(expiresAt)
        : null;
  const updatedDate =
    updatedAt && typeof (updatedAt as Timestamp).toDate === "function"
      ? (updatedAt as Timestamp).toDate()
      : typeof updatedAt === "string"
        ? new Date(updatedAt)
        : createdDate;
  const displayName = (data.author_display_name as string | null | undefined) ?? "Anonimo";
  const avatarUrl = (data.author_avatar_url as string | null | undefined) ?? null;
  const status = isEventStatus(data.status) ? data.status : "community";
  const evidence = normalizeEvidence(
    data.verification_evidence as VerificationEvidence | undefined,
  );

  return {
    id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    category: categoryMeta[data.category as Category] ? (data.category as Category) : "social",
    latitude: Number(data.latitude ?? 45.4642),
    longitude: Number(data.longitude ?? 9.19),
    location_name: (data.location_name as string | null | undefined) ?? null,
    image_url: (data.image_url as string | null | undefined) ?? null,
    image_path: (data.image_path as string | null | undefined) ?? null,
    author_id: String(data.author_id ?? ""),
    author_display_name: displayName,
    author_avatar_url: avatarUrl,
    status,
    verification_score: Number(data.verification_score ?? 0),
    verification_evidence: evidence,
    report_count: Number(data.report_count ?? 0),
    updated_at: updatedDate.toISOString(),
    creator_id: String(data.creator_id ?? data.author_id ?? ""),
    creator_name: String(data.creator_name ?? displayName),
    creator_trust_score: Number(data.creator_trust_score ?? 0),
    creator_is_verified_organizer: Boolean(data.creator_is_verified_organizer ?? false),
    created_at: createdDate.toISOString(),
    expires_at: expiresDate?.toISOString() ?? null,
    profiles: {
      display_name: displayName,
      avatar_url: avatarUrl,
    },
  };
}

function fromFirestoreProfile(id: string, data: Record<string, unknown> | undefined): UserProfile {
  const createdAt = data?.account_created_at;
  const createdDate =
    createdAt && typeof (createdAt as Timestamp).toDate === "function"
      ? (createdAt as Timestamp).toDate()
      : typeof createdAt === "string"
        ? new Date(createdAt)
        : new Date();

  return {
    id,
    display_name: (data?.display_name as string | null | undefined) ?? null,
    avatar_url: (data?.avatar_url as string | null | undefined) ?? null,
    trust_score: Number(data?.trust_score ?? 0),
    is_verified_organizer: Boolean(data?.is_verified_organizer ?? false),
    events_created_count: Number(data?.events_created_count ?? 0),
    reports_received_count: Number(data?.reports_received_count ?? 0),
    successful_events_count: Number(data?.successful_events_count ?? 0),
    account_created_at: createdDate.toISOString(),
    business_name: (data?.business_name as string | null | undefined) ?? null,
    business_address: (data?.business_address as string | null | undefined) ?? null,
    business_vat_or_id: (data?.business_vat_or_id as string | null | undefined) ?? null,
    business_website: (data?.business_website as string | null | undefined) ?? null,
    business_instagram: (data?.business_instagram as string | null | undefined) ?? null,
    verification_status:
      data?.verification_status === "verified" || data?.verification_status === "rejected"
        ? data.verification_status
        : "pending",
  };
}

function fromFirestoreReport(id: string, data: Record<string, unknown>): EventReport {
  const createdAt = data.created_at;
  const createdDate =
    createdAt && typeof (createdAt as Timestamp).toDate === "function"
      ? (createdAt as Timestamp).toDate()
      : typeof createdAt === "string"
        ? new Date(createdAt)
        : new Date();

  return {
    report_id: String(data.report_id ?? id),
    event_id: String(data.event_id ?? ""),
    reporter_id: String(data.reporter_id ?? ""),
    reason: isReportReason(data.reason) ? data.reason : "other",
    description: (data.description as string | null | undefined) ?? null,
    created_at: createdDate.toISOString(),
  };
}

function normalizeEvidence(evidence: VerificationEvidence | undefined): VerificationEvidence {
  return {
    officialUrl: cleanOptional(evidence?.officialUrl),
    instagramUrl: cleanOptional(evidence?.instagramUrl),
    flyerImageUrl: cleanOptional(evidence?.flyerImageUrl),
    venueName: cleanOptional(evidence?.venueName),
    venueAddress: cleanOptional(evidence?.venueAddress),
    contactPhone: cleanOptional(evidence?.contactPhone),
    organizerName: cleanOptional(evidence?.organizerName),
  };
}

function calculateVerificationScore(evidence: VerificationEvidence) {
  let score = 0;
  if (evidence.officialUrl) score += 20;
  if (evidence.instagramUrl) score += 15;
  if (evidence.flyerImageUrl) score += 15;
  if (evidence.venueName && evidence.venueAddress) score += 20;
  if (evidence.contactPhone) score += 10;
  if (evidence.organizerName) score += 10;
  return score;
}

function resolveInitialStatus({
  isSpontaneous,
  verificationScore,
  forceReview,
}: {
  isSpontaneous: boolean;
  verificationScore: number;
  forceReview: boolean;
}): EventStatus {
  if (forceReview) return "under_review";
  if (verificationScore >= 50) return "under_review";
  return isSpontaneous ? "spontaneous" : "community";
}

async function moderatePostInput(input: CreatePostInput) {
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3) return { blocked: true, review: false, reason: "Titolo troppo corto." };

  const haystack = `${title} ${description}`.toLowerCase();
  const blacklist = ["odio", "razzista", "truffa", "violenza"];
  if (blacklist.some((word) => haystack.includes(word))) {
    return { blocked: true, review: false, reason: "Contenuto non consentito." };
  }

  const linkCount = (description.match(/https?:\/\//gi) ?? []).length;
  const duplicate = await hasDuplicatePost(input);
  return {
    blocked: false,
    review: linkCount >= 3 || duplicate,
    reason: duplicate ? "Possibile duplicato." : "",
  };
}

async function hasDuplicatePost(input: CreatePostInput) {
  let snapshot;
  try {
    snapshot = await getDocs(
      query(
        collection(firestore, "posts"),
        where("title", "==", input.title.trim()),
        where("status", "in", visibleEventStatuses),
      ),
    );
  } catch (error) {
    if (isFirestorePermissionError(error)) return false;
    throw error;
  }
  const targetDate = new Date(input.expiresAt).toISOString().slice(0, 10);
  const targetLocation = (input.locationName ?? "").trim().toLowerCase();

  return snapshot.docs.some((document) => {
    const post = fromFirestorePost(document.id, document.data());
    const postDate = post.expires_at ? post.expires_at.slice(0, 10) : "";
    return (
      postDate === targetDate && (post.location_name ?? "").trim().toLowerCase() === targetLocation
    );
  });
}

function isFirestorePermissionError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("Missing or insufficient permissions") ||
      error.message.includes("permission-denied"))
  );
}

async function countPostsCreatedToday(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const snapshot = await getDocs(
    query(collection(firestore, "posts"), where("author_id", "==", userId)),
  );
  return snapshot.docs
    .map((post) => fromFirestorePost(post.id, post.data()))
    .filter((post) => new Date(post.created_at).getTime() >= start.getTime()).length;
}

function dailyEventLimit(profile: UserProfile) {
  if (profile.is_verified_organizer) return 20;
  if (profile.trust_score >= 50) return 5;
  return 1;
}

function isCurrentUserAllowedToSee(post: PostRow) {
  const user = firebaseAuth.currentUser;
  return Boolean(user && (user.uid === post.author_id || user.uid === post.creator_id));
}

function isEventStatus(value: unknown): value is EventStatus {
  return (
    value === "community" ||
    value === "spontaneous" ||
    value === "verified" ||
    value === "under_review" ||
    value === "hidden" ||
    value === "rejected"
  );
}

function isReportReason(value: unknown): value is EventReportReason {
  return (
    value === "fake_event" ||
    value === "wrong_location" ||
    value === "spam" ||
    value === "offensive_content" ||
    value === "scam" ||
    value === "duplicate" ||
    value === "other"
  );
}

function cleanOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function deletePostIfAllowed(post: PostRow) {
  const user = firebaseAuth.currentUser;
  if (!user || user.uid !== post.author_id) return;
  await deleteDoc(doc(firestore, "posts", post.id));
}
