import { supabase } from "../config/supabaseClient.js";
import { claimPendingSharesByEmail } from "./sharing.service.js";

type UpdateProfileInput = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  dob?: string;
};

export async function updateUserProfile(input: UpdateProfileInput) {
  const { userId, firstName, lastName, email, dob } = input;

  // We perform the update and flip the 'profile_completed' flag to true
  const { data, error } = await supabase
    .from("users")
    .update({
      first_name: firstName,
      last_name: lastName,
      email: email,
      date_of_birth: dob,
      profile_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("PostgreSQL Update Error:", error.message);
    throw new Error(error.message);
  }

  // Profile setup is the usual point a phone-signup user first gets an email,
  // so attach any reminders that were shared to that email before they joined.
  if (email) {
    await claimPendingSharesByEmail(userId, email).catch((e) =>
      console.error('claimPendingShares (profile update) failed:', e?.message || e)
    );
  }

  return data;
}
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('first_name, last_name, email, date_of_birth, profile_picture, email_verified')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}