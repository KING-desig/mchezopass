import { supabase } from './supabase';

export const MATCH_PROOF_BUCKET = 'match-screenshots';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function resolveMatchProofUrl(proofReference: string | null) {
  if (!proofReference) return { url: null, error: null };

  if (/^https?:\/\//i.test(proofReference)) {
    return { url: proofReference, error: null };
  }

  const { data, error } = await supabase.storage
    .from(MATCH_PROOF_BUCKET)
    .createSignedUrl(proofReference, SIGNED_URL_TTL_SECONDS);

  return { url: data?.signedUrl ?? null, error };
}